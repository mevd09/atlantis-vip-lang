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
    TypeDescription
} from '../../src/language/type-system/descriptions.js';
import { createAtlantisVipServices } from '../../src/language/atlantis-vip-module.js';
import { NodeFileSystem } from 'langium/node';
import { extractAstNode } from '../../src/cli/cli-util.js';
import * as path from 'path';
import { Model } from '../../src/language/generated/ast.js';

describe('Type Inference', () => {
    const services = createAtlantisVipServices(NodeFileSystem).AtlantisVip;
    const cache = new Map();
    const fixturesDir = path.resolve(__dirname, '../fixtures/type-inference');

    describe('Literal Types', () => {
        it('should infer boolean literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'boolean.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isBooleanType(type)).toBe(true);
        });

        it('should infer number literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'number.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer string literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'string.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isStringType(type)).toBe(true);
        });

        it('should infer hex literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'hex.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer binary literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'binary.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer float literal type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'float.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isNumberType(type)).toBe(true);
        });
    });

    describe('Array Types', () => {
        it('should infer array types correctly', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'array.vip'), services) as Model;
            const type = inferType(ast.interfaces[0].varsOfTypes[0].type, cache);
            expect(isArrayType(type)).toBe(true);
            if (isArrayType(type)) {
                expect(isNumberType(type.elementType)).toBe(true);
                expect(type.rightBound).toBe(10);
            }
        });

        it('should infer array indexing correctly', () => {
            // Create a number array type
            const numberType = createNumberTypeDescription();
            const arrayType = createArrayTypeDescription(numberType, 10);
            
            // Create a mock array access expression
            const mockArrayAccess = {
                $type: 'MemberCall',
                previous: { $type: 'array' },  // This would be the array reference in real code
                explicitOperationCall: true,
                arguments: [{ $type: 'NumberLiteral', value: 5 }]
            };
            
            // Set up the cache with our mock array
            const cache = new Map();
            cache.set(mockArrayAccess.previous, arrayType);
            
            // Test inference
            const resultType = inferType(mockArrayAccess as any, cache);
            expect(isNumberType(resultType)).toBe(true);
        });

    });

    describe('Record Types', () => {
        it('should infer record field access', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'record-field.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isStringType(type)).toBe(true);
        });

        it('should handle invalid record field access', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'invalid-record-field.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(type.$type).toBe('error');
        });
    });

    describe('Binary Expressions', () => {
        it('should infer arithmetic operation types', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'arithmetic.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer comparison operation types', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'comparison.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isBooleanType(type)).toBe(true);
        });

        it('should infer string concatenation', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'string-concat.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isStringType(type)).toBe(true);
        });

        it('should infer logical operation types', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'logical.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isBooleanType(type)).toBe(true);
        });

        it('should infer division operation types', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'division.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer power operation type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'power.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isNumberType(type)).toBe(true);
        });
    });

    describe('Unary Expressions', () => {
        it('should infer unary minus type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'unary-minus.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer unary plus type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'unary-plus.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isNumberType(type)).toBe(true);
        });

        it('should infer logical not type', async () => {
            const ast = await extractAstNode(path.join(fixturesDir, 'logical-not.vip'), services) as Model;
            const type = inferType(ast.expressions[0], cache);
            expect(isBooleanType(type)).toBe(true);
        });
    });

    describe('Type Assignment', () => {
        it('should check compatible types', () => {
            const numberType = createNumberTypeDescription();
            const stringType = createStringTypeDescription();
            const booleanType = createBooleanTypeDescription();
            const numberArray = createArrayTypeDescription(numberType, 1, 10);
            const stringArray = createArrayTypeDescription(stringType, 1, 10);

            // Basic type compatibility
            expect(isAssignable(numberType, numberType)).toBe(true);
            expect(isAssignable(stringType, stringType)).toBe(true);
            expect(isAssignable(booleanType, booleanType)).toBe(true);
            expect(isAssignable(numberType, stringType)).toBe(false);
            expect(isAssignable(stringType, numberType)).toBe(false);

            // Array compatibility
            expect(isAssignable(numberArray, numberArray)).toBe(true);
            expect(isAssignable(stringArray, stringArray)).toBe(true);
            expect(isAssignable(numberArray, stringArray)).toBe(false);

            // Record compatibility
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
        });
    });
}); 