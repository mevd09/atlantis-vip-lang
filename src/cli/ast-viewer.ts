import { AstNode, LangiumDocument } from 'langium';
import { extractDocument } from './cli-util.js';
import { LangiumCoreServices } from 'langium';

export async function showAst(fileName: string, services: LangiumCoreServices): Promise<void> {
    try {
        const document: LangiumDocument = await extractDocument(fileName, services);
        if (!document.parseResult?.value) {
            console.error('No AST was generated. Check for parsing errors.');
            return;
        }
        
        const ast = document.parseResult.value;
        const printed = prettyPrintAst(ast);
        if (!printed) {
            console.error('Failed to print AST.');
            return;
        }
        
        console.log(JSON.stringify(printed, null, 2));
    } catch (error) {
        console.error('Error while processing AST:', error);
    }
}

function prettyPrintAst(node: AstNode | undefined): any {
    if (!node) return undefined;

    try {
        const result: any = {
            $type: node.$type
        };

        for (const [key, value] of Object.entries(node)) {
            // Skip Langium internal properties and references
            if (key.startsWith('$') ) continue;
            if ((node.$type === 'RefType' || node.$type === 'Ref') && value.$refText) {
                result[key] = value.$refText;
            } else if (Array.isArray(value)) {
                result[key] = value.map(item => {
                    if (item && typeof item === 'object' && '$type' in item) {
                        return prettyPrintAst(item as AstNode);
                    }
                    return item;
                }).filter(item => item !== undefined);
            } else if (value && typeof value === 'object' && '$type' in value) {
                const printed = prettyPrintAst(value as AstNode);
                if (printed !== undefined) {
                    result[key] = printed;
                }
            } else if (value !== undefined && value !== null) {
                result[key] = value;
            }
        }

        return result;
    } catch (error) {
        console.error('Error while printing node:', error);
        return undefined;
    }
} 