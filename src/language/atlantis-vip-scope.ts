import { AstNode, Scope, ScopeProvider, ReferenceInfo, AstNodeDescription, LangiumCoreServices, AstNodeDescriptionProvider, AstUtils, MapScope } from 'langium';
import { 
    isNamedViewField, 
    isInterface, 
    isModel,
    isView,
    VarsOfType,
    NamedViewField,
    VarDeclaration,
} from './generated/ast.js';
import { stream } from 'langium';

export class AtlantisVipScopeProvider implements ScopeProvider {

    private astNodeDescriptionProvider: AstNodeDescriptionProvider;
    
    constructor(services: LangiumCoreServices) {
        this.astNodeDescriptionProvider = services.workspace.AstNodeDescriptionProvider;
    }
    
    /**
     * Returns the global scope which contains all visible elements
     */
    protected getGlobalScope(referenceType: string): Scope {
        return new MapScope(stream<AstNodeDescription>());
    }

    /**
     * Main entry point for scope resolution
     */
    public getScope(context: ReferenceInfo): Scope {
        // Handle different reference types
        if (context.property === 'element') {
            // This is for MemberCall.element and FeatureCall.element references to NamedElements
            return this.getNamedElementScope(context.container);
        } else if (context.property === 'reference' && context.reference && context.container.$type === 'TypeReference') {
            // This is for TypeReference.reference references to Type
            return this.getTypeScope(context.container);
        }

        // Default empty scope for unsupported reference types
        return new MapScope(stream<AstNodeDescription>());
    }

    /**
     * Creates a scope with all accessible named elements at a given node
     */
    private getNamedElementScope(node: AstNode): Scope {
        const descriptions: AstNodeDescription[] = [];
        
        // Add local variables from containing scopes
        this.addLocalVariables(node, descriptions);
        
        // Add field names for record field access
        this.addRecordFields(node, descriptions);
        
        // Add 'self' reference if inside a view or interface
        this.addSelfReference(node, descriptions);

        // Add named view fields
        this.addNamedViewFields(node, descriptions);
        
        // Add all types
        this.addTypes(node, descriptions);

        return new MapScope(descriptions);
    }

    /**
     * Creates a scope with all accessible types at a given node
     */
    private getTypeScope(node: AstNode): Scope {
        const descriptions: AstNodeDescription[] = [];
        
        // Add all types (records and user types)
        this.addTypes(node, descriptions);
        
        return new MapScope(descriptions);
    }

    /**
     * Adds all local variables that are in scope at the given node
     */
    private addLocalVariables(node: AstNode, descriptions: AstNodeDescription[]): void {
        // Find all variables in all parent scopes
        const model = AstUtils.getContainerOfType(node, isModel);
        
        // First check interface-level declarations
        const containingInterface = AstUtils.getContainerOfType(node, isInterface);
        if (containingInterface) {
            // Add variables from interface declarations
            containingInterface.declarations.forEach(decl => this.addVariablesFromDeclaration(decl, descriptions));
            
            // Add variables from the current view if inside a view
            const containingView = AstUtils.getContainerOfType(node, isView);
            if (containingView) {
                containingView.declarations.forEach(decl => this.addVariablesFromDeclaration(decl, descriptions));
            }
        }
        
        // Add top-level variables from model statements
        if (model) {
            const varDeclarations = model.statements.filter(stmt => 'varsOfTypes' in stmt);
            varDeclarations.forEach(varDecl => {
                if ('varsOfTypes' in varDecl) {
                    const varsOfTypes = varDecl.varsOfTypes || [];
                    this.addVariablesFromVarsOfType(varsOfTypes, descriptions);
                }
            });
        }
    }

    /**
     * Adds variables from a VarDeclaration to the description list
     */
    private addVariablesFromDeclaration(declaration: VarDeclaration, descriptions: AstNodeDescription[]): void {
        const varsOfTypes = declaration.varsOfTypes || [];
        this.addVariablesFromVarsOfType(varsOfTypes, descriptions);
    }

    /**
     * Adds variables from a list of VarsOfType to the description list
     */
    private addVariablesFromVarsOfType(varsOfTypes: VarsOfType[], descriptions: AstNodeDescription[]): void {
        varsOfTypes.forEach(vot => {
            vot.vars.forEach(variable => {
                descriptions.push(this.astNodeDescriptionProvider.createDescription(variable, variable.name));
            });
        });
    }

    /**
     * Adds record fields that are accessible at the given node
     */
    private addRecordFields(node: AstNode, descriptions: AstNodeDescription[]): void {
        // This would be implemented for record field access
        // In a complete implementation, we would need to track the type of the receiver
        // For now, we'll leave this as a placeholder
    }

    /**
     * Adds 'self' reference if inside a view or interface
     */
    private addSelfReference(node: AstNode, descriptions: AstNodeDescription[]): void {
        const view = AstUtils.getContainerOfType(node, isView);
        if (view) {
            // Add the view itself as 'self'
            descriptions.push(this.astNodeDescriptionProvider.createDescription(view, 'self'));
            return;
        }
        
        const interface_ = AstUtils.getContainerOfType(node, isInterface);
        if (interface_) {
            // Add the interface itself as 'self'
            descriptions.push(this.astNodeDescriptionProvider.createDescription(interface_, 'self'));
        }
    }
    
    /**
     * Adds all named view fields to the scope
     */
    private addNamedViewFields(node: AstNode, descriptions: AstNodeDescription[]): void {
        const model = AstUtils.getContainerOfType(node, isModel);
        if (model) {
            // Collect all named view fields from all interfaces
            model.interfaces.forEach(interface_ => {
                interface_.views.forEach(view => {
                    view.fields?.filter(isNamedViewField)
                        .forEach((namedField: NamedViewField) => {
                            descriptions.push(this.astNodeDescriptionProvider.createDescription(namedField, namedField.name));
                        });
                });
            });
        }
    }
    
    /**
     * Adds all type definitions to the scope
     */
    private addTypes(node: AstNode, descriptions: AstNodeDescription[]): void {
        const model = AstUtils.getContainerOfType(node, isModel);
        if (model) {
            // Global types from the model
            model.types.forEach(type => {
                descriptions.push(this.astNodeDescriptionProvider.createDescription(type, type.name));
            });
            
            // Types from interfaces
            model.interfaces.forEach(interface_ => {
                interface_.types.forEach(type => {
                    descriptions.push(this.astNodeDescriptionProvider.createDescription(type, type.name));
                });
            });
        }
        
        // Types defined in the current interface
        const containingInterface = AstUtils.getContainerOfType(node, isInterface);
        if (containingInterface) {
            containingInterface.types.forEach(type => {
                descriptions.push(this.astNodeDescriptionProvider.createDescription(type, type.name));
            });
        }
    }
}

// class MapScope implements Scope {
//     constructor(private elements: Map<string, AstNodeDescription>) {}

//     getAllElements(): Stream<AstNodeDescription> {
//         return stream(this.elements.values());
//     }

//     get(name: string): AstNodeDescription | undefined {
//         return this.elements.get(name);
//     }

//     getElement(name: string): AstNodeDescription {
//         const element = this.elements.get(name);
//         if (!element) {
//             throw new Error(`Element ${name} not found in scope`);
//         }
//         return element;
//     }
// } 