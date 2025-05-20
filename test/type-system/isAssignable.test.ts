import { describe, expect, it } from 'vitest';
import { isAssignable } from '../../src/language/type-system/infer.js';
import {
    createBooleanTypeDescription,
    createNumberTypeDescription,
    createStringTypeDescription,
    createArrayTypeDescription,
    createRecordTypeDescription,
    createUserTypeDescription,
    TypeDescription
} from '../../src/language/type-system/descriptions.js';

describe('Type Assignment', () => {
    it('should check compatible types', () => {
        const numberType = createNumberTypeDescription();
        const stringType = createStringTypeDescription();
        const booleanType = createBooleanTypeDescription();
        const numberArray = createArrayTypeDescription(numberType, 1, 10);
        const stringArray = createArrayTypeDescription(stringType, 1, 10);

        // Basic type compatibility
        console.log('numberType, numberType', isAssignable(numberType, numberType));
        console.log('stringType, stringType', isAssignable(stringType, stringType));
        console.log('booleanType, booleanType', isAssignable(booleanType, booleanType));
        console.log('numberType, stringType', isAssignable(numberType, stringType));
        console.log('stringType, numberType', isAssignable(stringType, numberType));
        
        expect(isAssignable(numberType, numberType)).toBe(true);
        expect(isAssignable(stringType, stringType)).toBe(true);
        expect(isAssignable(booleanType, booleanType)).toBe(true);
        expect(isAssignable(numberType, stringType)).toBe(false);
        expect(isAssignable(stringType, numberType)).toBe(false);

        // Array compatibility
        console.log('numberArray, numberArray', isAssignable(numberArray, numberArray));
        console.log('stringArray, stringArray', isAssignable(stringArray, stringArray));
        console.log('numberArray, stringArray', isAssignable(numberArray, stringArray));
        
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

        console.log('record1, record2', isAssignable(record1, record2));
        console.log('record1, record3', isAssignable(record1, record3));
        
        expect(isAssignable(record1, record2)).toBe(true);
        expect(isAssignable(record1, record3)).toBe(false);

        // User type compatibility
        const userType1 = createUserTypeDescription(numberType);
        const userType2 = createUserTypeDescription(numberType);
        const userType3 = createUserTypeDescription(stringType);

        console.log('userType1, userType2', isAssignable(userType1, userType2));
        console.log('userType1, userType3', isAssignable(userType1, userType3));
        
        expect(isAssignable(userType1, userType2)).toBe(true);
        expect(isAssignable(userType1, userType3)).toBe(false);
    });
}); 