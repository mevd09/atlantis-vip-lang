import { AstNode, Scope, ScopeProvider, ReferenceInfo, AstNodeDescription, LangiumCoreServices, AstNodeDescriptionProvider, AstUtils, MapScope } from 'langium';
import { 
    isNamedViewField, 
    isInterface, 
    VarsOfType,
    Variable,
    NamedViewField,
    VarDeclaration
} from './generated/ast.js';
import { stream } from 'langium';

export class AtlantisVipScopeProvider implements ScopeProvider {

    private astNodeDescriptionProvider: AstNodeDescriptionProvider;
    
    constructor(services: LangiumCoreServices) {
        this.astNodeDescriptionProvider = services.workspace.AstNodeDescriptionProvider;
    }
    
    protected getGlobalScope(referenceType: string): Scope {
        return new MapScope(stream<AstNodeDescription>());
    }

    public getScope(context: ReferenceInfo): Scope {
        
        if (context.property === 'element') {
             return this.getRefScope(context.container);
        }

        return new MapScope(stream<AstNodeDescription>());
    }

    private getRefScope(node: AstNode): Scope {
        const references: AstNodeDescription[] = [];
        
        const interface_ = AstUtils.getContainerOfType(node, isInterface)!;
        if (!interface_) {
            return new MapScope(references);
        }

        interface_.views.forEach(view => {
            view.declarations?.forEach((declaration: VarDeclaration) => {
                declaration.varsOfTypes?.forEach((varsOfType: VarsOfType) => {
                    varsOfType.vars.forEach((variable: Variable) => {
                        const description = this.astNodeDescriptionProvider.createDescription(variable, variable.name);
                        references.push(description);
                    });
                });
            });
            view.fields?.filter(isNamedViewField)
                .forEach((namedField: NamedViewField) => {
                    const description = this.astNodeDescriptionProvider.createDescription(namedField, namedField.name);
                    references.push(description);
                });
        });

        return new MapScope(references);
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