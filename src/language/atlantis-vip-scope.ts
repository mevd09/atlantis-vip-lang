import { AstNode, Scope, ScopeProvider, ReferenceInfo, AstNodeDescription, LangiumCoreServices, AstNodeDescriptionProvider, AstUtils } from 'langium';
import { View, Interface, NamedField } from './generated/ast.js';
import { stream, Stream } from 'langium';
import { isInterface } from './generated/ast.js';

export class AtlantisVipScopeProvider implements ScopeProvider {

    private astNodeDescriptionProvider: AstNodeDescriptionProvider;
    
    constructor(services: LangiumCoreServices) {
        this.astNodeDescriptionProvider = services.workspace.AstNodeDescriptionProvider;
    }
    
    protected getGlobalScope(referenceType: string): Scope {
        return new MapScope(new Map());
    }

    public getScope(context: ReferenceInfo): Scope {
        const referenceType = context.property;
        
        // Handle variable references
        if (context.property === 'ref') {
            return this.getVariableScope(context.container);
        }
        
        // Handle view references
        if (referenceType === 'View') {
            return this.getViewScope(context.container);
        }
        
        // Handle field references
        if (referenceType === 'Field') {
            return this.getFieldScope(context.container);
        }

        return new MapScope(new Map());
    }

    private getVariableScope(node: AstNode): Scope {
        const variables = new Map<string, AstNodeDescription>();
        
        const interface_ = AstUtils.getContainerOfType(node, isInterface)!;
        // Add variables from all views in the interface
        interface_.views.forEach(view => {
            view.vars.forEach(varsDecl => {
                varsDecl.names.forEach(variable => {
                    const description = this.astNodeDescriptionProvider.createDescription(variable, variable.name);
                    variables.set(variable.name, description);
                });
            });
            view.fields?.forEach(field => {
                if (field.$type === 'NamedField') {
                    const namedField = field as NamedField;
                    const description = this.astNodeDescriptionProvider.createDescription(namedField, namedField.name);
                    variables.set(namedField.name, description);
                }
            });
        });

        return new MapScope(variables);
    }

    private getViewScope(node: AstNode): Scope {
        const views = new Map<string, AstNodeDescription>();
        
        // Get all views from the current interface
        let current = node;
        while (current) {
            if (current.$type === 'Interface') {
                const interface_ = current as Interface;
                interface_.views.forEach(view => {
                    if (view.name && view.$document) {
                        views.set(view.name, {
                            type: view.$type,
                            name: view.name,
                            documentUri: view.$document.uri,
                            path: view.$cstNode?.text ?? view.name
                        });
                    }
                });
                break;
            }
            current = current.$container as AstNode;
        }

        return new MapScope(views);
    }

    private getFieldScope(node: AstNode): Scope {
        const fields = new Map<string, AstNodeDescription>();
        
        // Get all fields from the current view
        let current = node;
        while (current) {
            if (current.$type === 'View') {
                const view = current as View;
                view.fields?.forEach(field => {
                    if (field.$type === 'NamedField' && field.$document) {
                        const namedField = field as NamedField;
                        fields.set(namedField.name, {
                            type: field.$type,
                            name: namedField.name,
                            documentUri: field.$document.uri,
                            path: field.$cstNode?.text ?? namedField.name
                        });
                    }
                });
                break;
            }
            current = current.$container as AstNode;
        }

        return new MapScope(fields);
    }
}

class MapScope implements Scope {
    constructor(private elements: Map<string, AstNodeDescription>) {}

    getAllElements(): Stream<AstNodeDescription> {
        return stream(this.elements.values());
    }

    get(name: string): AstNodeDescription | undefined {
        return this.elements.get(name);
    }

    getElement(name: string): AstNodeDescription {
        const element = this.elements.get(name);
        if (!element) {
            throw new Error(`Element ${name} not found in scope`);
        }
        return element;
    }
} 