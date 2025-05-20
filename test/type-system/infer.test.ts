import { describe, expect, it } from 'vitest';
import { inferType, isAssignable } from '../../src/language/type-system/infer.js';
import {
    createBooleanTypeDescription,
    createNumberTypeDescription,
    createStringTypeDescription,
    createArrayTypeDescription,
    createRecordTypeDescription,
    createUserTypeDescription,
    createDateTypeDescription,
    createTimeTypeDescription,
    createDateTimeTypeDescription,
    isBooleanType,
    isNumberType,
    isStringType,
    isArrayType,
    isRecordType,
    isUserType,
    isUnknownType,
    TypeDescription
} from '../../src/language/type-system/descriptions.js';
import { createAtlantisVipServices } from '../../src/language/atlantis-vip-module.js';
import { NodeFileSystem } from 'langium/node';
import { extractAstNode } from '../../src/cli/cli-util.js';
import * as path from 'path';
import { Model, isExpressionStatement } from '../../src/language/generated/ast.js';

describe('Type Inference', () => {
    const services = createAtlantisVipServices(NodeFileSystem).AtlantisVip;
    const cache = new Map();
    const fixturesDir = path.resolve(__dirname, '../fixtures/type-inference');

    describe('Literal Types', () => {
        it('should infer boolean literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'boolean.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isBooleanType(type)).toBe(true);
        });

        it('should infer number literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'number.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer string literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'string.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isStringType(type)).toBe(true);
        });

        it('should infer hex literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'hex.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer binary literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'binary.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer float literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'float.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isNumberType(type)).toBe(true);
        });
    });

    describe('Array Types', () => {
        it('should infer array types correctly', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'array.vip'), services) as Model;
            const iface = ast.interfaces[0];
            if (iface && iface.declarations.length > 0 && iface.declarations[0].varsOfTypes.length > 0) {
                const type = inferType(iface.declarations[0].varsOfTypes[0].type, cache);
                expect(isArrayType(type)).toBe(true);
                if (isArrayType(type)) {
                    expect(isNumberType(type.elementType)).toBe(true);
                    expect(type.rightBound).toBe(10);
                }
            }
        });

        it('should infer array indexing correctly', () => {
            const numberType = createNumberTypeDescription();
            const arrayType = createArrayTypeDescription(numberType, 10);
            
            const mockArrayAccess = {
                $type: 'MemberCall',
                previous: { $type: 'array' },
                explicitOperationCall: true,
                arguments: [{ $type: 'NumberLiteral', value: 5 }]
            };
            
            const cache = new Map();
            cache.set(mockArrayAccess.previous, arrayType);
            
            const resultType = inferType(mockArrayAccess as any, cache);
            expect(isNumberType(resultType)).toBe(true);
        });

    });

    describe('Record Types', () => {
        it('should infer record field access', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'record-field.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isStringType(type)).toBe(true);
        });

        it('should handle invalid record field access', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'invalid-record-field.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(type.$type).toBe('error');
        });
    });

    describe('Binary Expressions', () => {
        it('should infer arithmetic operation types', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'arithmetic.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer comparison operation types', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'comparison.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isBooleanType(type)).toBe(true);
        });

        it('should infer string concatenation', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'string-concat.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isStringType(type)).toBe(true);
        });

        it('should infer logical operation types', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'logical.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isBooleanType(type)).toBe(true);
        });

        it('should infer division operation types', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'division.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer power operation type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'power.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isNumberType(type)).toBe(true);
        });
    });

    describe('Unary Expressions', () => {
        it('should infer unary minus type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'unary-minus.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer unary plus type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'unary-plus.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer logical not type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'logical-not.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isBooleanType(type)).toBe(true);
        });
    });

    describe('Variable and User Type References', () => {
        it('should infer variable type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'variable.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer user-defined type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'user-type.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isUserType(type)).toBe(true);
            if (isUserType(type)) {
                expect(isNumberType(type.baseType)).toBe(true);
            }
        });

        it('should handle self references', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'self-reference.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isUnknownType(type)).toBe(true);
        });

        it('should handle user-defined record types', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'user-type-record.vip'), services) as Model;
            const exprStmt = ast.statements.find(isExpressionStatement);
            const type = inferType(exprStmt?.expression, cache);
            expect(isStringType(type)).toBe(true);
        });
    });

    describe('Type Assignment', () => {
        it('should check compatible types', () => {
            const numberType = createNumberTypeDescription();
            const stringType = createStringTypeDescription();
            const booleanType = createBooleanTypeDescription();
            const numberArray = createArrayTypeDescription(numberType, 1, 10);
            const stringArray = createArrayTypeDescription(stringType, 1, 10);

            expect(isAssignable(numberType, numberType)).toBe(true);
            expect(isAssignable(stringType, stringType)).toBe(true);
            expect(isAssignable(booleanType, booleanType)).toBe(true);
            expect(isAssignable(numberType, stringType)).toBe(false);
            expect(isAssignable(stringType, numberType)).toBe(false);

            expect(isAssignable(numberArray, numberArray)).toBe(true);
            expect(isAssignable(stringArray, stringArray)).toBe(true);
            expect(isAssignable(numberArray, stringArray)).toBe(false);

            const record1 = createRecordTypeDescription(new Map<string, TypeDescription>([
                ['field1', numberType],
                ['field2', stringType]
            ]));
            const record2 = createRecordTypeDescription(new Map<string, TypeDescription>([
                ['field1', numberType],
                ['field2', stringType]
            ]));
            const record3 = createRecordTypeDescription(new Map<string, TypeDescription>([
                ['field1', stringType],
                ['field2', numberType]
            ]));

            expect(isAssignable(record1, record2)).toBe(true);
            expect(isAssignable(record1, record3)).toBe(false);

            const userType1 = createUserTypeDescription(numberType);
            const userType2 = createUserTypeDescription(numberType);
            const userType3 = createUserTypeDescription(stringType);

            expect(isAssignable(userType1, userType2)).toBe(true);
            expect(isAssignable(userType1, userType3)).toBe(false);
        });
    });
}); 