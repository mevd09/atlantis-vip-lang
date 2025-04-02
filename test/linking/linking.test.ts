import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { expandToString as s } from "langium/generate";
import { clearDocuments, parseHelper } from "langium/test";
import { createAtlantisVipServices } from "../../src/language/atlantis-vip-module.js";
import { Model, isModel, NamedField, isNamedField, Ref, isRef } from "../../src/language/generated/ast.js";

let services: ReturnType<typeof createAtlantisVipServices>;
let parse:    ReturnType<typeof parseHelper<Model>>;
let document: LangiumDocument<Model> | undefined;

beforeAll(async () => {
    services = createAtlantisVipServices(EmptyFileSystem);
    parse = parseHelper<Model>(services.AtlantisVip);

    // activate the following if your linking test requires elements from a built-in library, for example
    // await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
});

afterEach(async () => {
    document && clearDocuments(services.shared, [ document ]);
});

describe('Linking tests', () => {
    test('variable reference linking', async () => {
        document = await parse(`
            interface TestInterface;
                create view TestView
                    var x: integer;
                    as select (x) (fieldname = asdf)
                ;
            end.
        `);

        const field = document.parseResult.value.interfaces[0].views[0].fields[0] as NamedField;
        const expression = field.expression;
        expect(
            checkDocumentValid(document) ||
            (isRef(expression) ? expression.ref.$refText : 'not a ref')
        ).toBe('x');
    });

    test('view reference linking', async () => {
        document = await parse(`
            interface TestInterface;
                create view MainView
                    var x: integer;
                    as select (x) (fieldname = x);
                ;
                create view ChildView
                    var y: integer;
                    as select (y) (fieldname = y);
                ;
            end.
        `);

        expect(
            checkDocumentValid(document) ||
            document.parseResult.value.interfaces[0].views.map(v => v.name).join(', ')
        ).toBe('MainView, ChildView');
    });

    test('field reference linking', async () => {
        document = await parse(`
            interface TestInterface;
                create view TestView
                    var x: integer;
                    as select (x) (fieldname = x), (x * 2) (fieldname = y);
                ;
            end.
        `);

        expect(
            checkDocumentValid(document) ||
            document.parseResult.value.interfaces[0].views[0].fields.map(f => 
                isNamedField(f) ? f.name.name : 'unnamed'
            ).join(', ')
        ).toBe('x, y');
    });
});

function checkDocumentValid(document: LangiumDocument): string | undefined {
    return document.parseResult.parserErrors.length && s`
        Parser errors:
          ${document.parseResult.parserErrors.map(e => e.message).join('\n  ')}
    `
        || document.parseResult.value === undefined && `ParseResult is 'undefined'.`
        || !isModel(document.parseResult.value) && `Root AST object is a ${document.parseResult.value.$type}, expected a '${Model}'.`
        || undefined;
}
