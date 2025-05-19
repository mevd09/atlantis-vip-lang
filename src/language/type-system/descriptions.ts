import { AstNode } from 'langium';
import { BooleanLiteral, NumberLiteral, StringLiteral, TypeReference,
    isIntType as isAstIntType,
    isFloatType as isAstFloatType,
    isStringType as isAstStringType,
    isBooleanType as isAstBooleanType,
    isDateType as isAstDateType,
    isTimeType as isAstTimeType,
    isDateTimeType as isAstDateTimeType,
    isArrayType as isAstArrayType,
    isRecord as isAstRecord,
    isUserType as isAstUserType
} from '../generated/ast.js';

export type TypeDescription = 
    | ErrorType
    | BooleanTypeDescription
    | NumberTypeDescription
    | StringTypeDescription
    | DateTypeDescription
    | TimeTypeDescription
    | DateTimeTypeDescription
    | ArrayTypeDescription
    | RecordTypeDescription
    | UserTypeDescription
    | UnknownTypeDescription;

export interface ErrorType {
    readonly $type: "error"
    readonly source?: AstNode
    readonly message: string
}

export function createErrorType(message: string, source?: AstNode): ErrorType {
    return {
        $type: "error",
        message,
        source
    };
}

export function isErrorType(item: TypeDescription): item is ErrorType {
    return item.$type === "error";
}

export interface BooleanTypeDescription {
    readonly $type: 'boolean',
    readonly literal?: BooleanLiteral,
}

export function createBooleanTypeDescription(literal?: BooleanLiteral): BooleanTypeDescription {
    return {
        $type: 'boolean',
        literal,
    };
}

export function isBooleanType(item: TypeDescription): item is BooleanTypeDescription {
    return item.$type === 'boolean';
}

export interface NumberTypeDescription {
    readonly $type: 'number',
    readonly literal?: NumberLiteral,
    readonly precision?: number,
    readonly scale?: number,
}

export function createNumberTypeDescription(literal?: NumberLiteral, precision?: number, scale?: number): NumberTypeDescription {
    return {
        $type: 'number',
        literal,
        precision,
        scale,
    };
}

export function isNumberType(item: TypeDescription): item is NumberTypeDescription {
    return item.$type === 'number';
}

export interface StringTypeDescription {
    readonly $type: 'string',
    readonly literal?: StringLiteral,
    readonly length?: number,
}

export function createStringTypeDescription(literal?: StringLiteral, length?: number): StringTypeDescription {
    return {
        $type: 'string',
        literal,
        length,
    };
}   

export function isStringType(item: TypeDescription): item is StringTypeDescription {
    return item.$type === 'string';
}

export interface DateTypeDescription {
    readonly $type: 'date',
}

export function createDateTypeDescription(): DateTypeDescription {
    return {
        $type: 'date',
    };
}

export function isDateType(item: TypeDescription): item is DateTypeDescription {
    return item.$type === 'date';
}

export interface TimeTypeDescription {
    readonly $type: 'time',
}

export function createTimeTypeDescription(): TimeTypeDescription {
    return {
        $type: 'time',
    };
}

export function isTimeType(item: TypeDescription): item is TimeTypeDescription {
    return item.$type === 'time';
}

export interface DateTimeTypeDescription {
    readonly $type: 'datetime',
}

export function createDateTimeTypeDescription(): DateTimeTypeDescription {
    return {
        $type: 'datetime',
    };
}

export function isDateTimeType(item: TypeDescription): item is DateTimeTypeDescription {
    return item.$type === 'datetime';
}

export interface ArrayTypeDescription {
    readonly $type: 'array',
    readonly elementType: TypeDescription,
    readonly rightBound: number,
    readonly leftBound?: number,
}

export function createArrayTypeDescription(elementType: TypeDescription, rightBound: number, leftBound?: number): ArrayTypeDescription {
    return {
        $type: 'array',
        elementType,
        rightBound,
        leftBound,
    };
}

export function isArrayType(item: TypeDescription): item is ArrayTypeDescription {
    return item.$type === 'array';
}

export interface RecordTypeDescription {
    readonly $type: 'record',
    readonly fields: Map<string, TypeDescription>,
}

export function createRecordTypeDescription(fields: Map<string, TypeDescription>): RecordTypeDescription {
    return {
        $type: 'record',
        fields,
    };
}

export function isRecordType(item: TypeDescription): item is RecordTypeDescription {
    return item.$type === 'record';
}

export interface UserTypeDescription {
    readonly $type: 'user',
    readonly baseType: TypeDescription,
}

export function createUserTypeDescription(baseType: TypeDescription): UserTypeDescription {
    return {
        $type: 'user',
        baseType,
    };
}

export function isUserType(item: TypeDescription): item is UserTypeDescription {
    return item.$type === 'user';
}

export interface UnknownTypeDescription {
    readonly $type: 'unknown',
}

export function createUnknownTypeDescription(): UnknownTypeDescription {
    return {
        $type: 'unknown',
    };
}

export function isUnknownType(item: TypeDescription): item is UnknownTypeDescription {
    return item.$type === 'unknown';
}

export function typeDescriptionToString(type: TypeDescription): string {
    switch (type.$type) {
        case 'error':
            return `Error: ${type.message}`;
        case 'boolean':
            return 'boolean';
        case 'number':
            return type.precision !== undefined ? `decimal[${type.precision}${type.scale !== undefined ? `,${type.scale}` : ''}]` : 'number';
        case 'string':
            return type.length !== undefined ? `string[${type.length}]` : 'string';
        case 'date':
            return 'date';
        case 'time':
            return 'time';
        case 'datetime':
            return 'datetime';
        case 'array':
            return `array[${type.leftBound !== undefined ? `${type.leftBound}..` : ''}${type.rightBound}] of ${typeDescriptionToString(type.elementType)}`;
        case 'record':
            return 'record';
        case 'user':
            return `type ${typeDescriptionToString(type.baseType)}`;
        case 'unknown':
            return 'unknown';
        default:
            return 'unknown';
    }
}

export function grammarTypeToTypeDescription(typeRef: TypeReference | undefined): TypeDescription {
    if (!typeRef) return createUnknownTypeDescription();

    // Handle built-in types using type guards
    if (isAstBooleanType(typeRef)) {
        return createBooleanTypeDescription();
    }
    if (isAstIntType(typeRef)) {
        return createNumberTypeDescription();
    }
    if (isAstFloatType(typeRef)) {
        return createNumberTypeDescription(undefined, typeRef.precision, typeRef.scale);
    }
    if (isAstStringType(typeRef)) {
        return createStringTypeDescription(undefined, typeRef.length);
    }
    if (isAstDateType(typeRef)) {
        return createDateTypeDescription();
    }
    if (isAstTimeType(typeRef)) {
        return createTimeTypeDescription();
    }
    if (isAstDateTimeType(typeRef)) {
        return createDateTimeTypeDescription();
    }
    if (isAstArrayType(typeRef)) {
        if (!typeRef.arrayType) return createErrorType('Array type must specify element type');
        return createArrayTypeDescription(
            grammarTypeToTypeDescription(typeRef.arrayType),
            typeRef.rightBound,
            typeRef.leftBound
        );
    }

    // Handle user-defined types
    if (typeRef.reference) {
        if (isAstRecord(typeRef.reference.ref)) {
            // TODO: Implement record type resolution
            return createUnknownTypeDescription();
        }
        if (isAstUserType(typeRef.reference.ref)) {
            // TODO: Implement user type resolution
            return createUnknownTypeDescription();
        }
    }

    return createUnknownTypeDescription();
}

// // Base type description
// export interface BaseTypeDescription {
//     $type: string;
//     name: string; 
// }

// // Specific type descriptions
// export interface IntegerTypeDescription extends BaseTypeDescription { $type: 'IntegerType'; name: 'byte'|'word'|'integer'|'longint'|'comp'; }
// export interface FloatTypeDescription extends BaseTypeDescription { $type: 'FloatType'; name: 'double'|'single'|'decimal'; }
// export interface StringTypeDescription extends BaseTypeDescription { $type: 'StringType'; name: 'string'; }
// export interface BooleanTypeDescription extends BaseTypeDescription { $type: 'BooleanType'; name: 'boolean'; }
// export interface DateTypeDescription extends BaseTypeDescription { $type: 'DateType'; name: 'date'; }
// export interface TimeTypeDescription extends BaseTypeDescription { $type: 'TimeType'; name: 'time'; }
// export interface DateTimeTypeDescription extends BaseTypeDescription { $type: 'DateTimeType'; name: '_datetime'; }
// // Add ArrayTypeDescription, RefTypeDescription, RecordTypeDescription as needed

// // Special types
// export interface UnknownTypeDescription extends BaseTypeDescription { $type: 'UnknownType'; name: 'unknown'; }
// export interface ErrorTypeDescription extends BaseTypeDescription { $type: 'ErrorType'; name: 'error'; }

// // Add ArrayTypeDescription if not already present
// export interface ArrayTypeDescription extends BaseTypeDescription { 
//     $type: 'ArrayType'; 
//     name: 'array'; 
//     elementType: AtlantisVipTypeDescription; // Type of elements
// }

// // Union of all possible type descriptions
// export type AtlantisVipTypeDescription = 
//     | IntegerTypeDescription
//     | FloatTypeDescription
//     | StringTypeDescription
//     | BooleanTypeDescription
//     | DateTypeDescription
//     | TimeTypeDescription
//     | DateTimeTypeDescription
//     | ArrayTypeDescription // Added
//     | UnknownTypeDescription
//     | ErrorTypeDescription;

// // Constants for special types
// export const UnknownType: UnknownTypeDescription = { $type: 'UnknownType', name: 'unknown' }; 
// export const ErrorType: ErrorTypeDescription = { $type: 'ErrorType', name: 'error' };

// // Type predicates
// export function isIntegerType(type: AtlantisVipTypeDescription): type is IntegerTypeDescription { return type.$type === 'IntegerType'; }
// export function isFloatType(type: AtlantisVipTypeDescription): type is FloatTypeDescription { return type.$type === 'FloatType'; }
// export function isStringType(type: AtlantisVipTypeDescription): type is StringTypeDescription { return type.$type === 'StringType'; }
// export function isBooleanType(type: AtlantisVipTypeDescription): type is BooleanTypeDescription { return type.$type === 'BooleanType'; }
// export function isDateType(type: AtlantisVipTypeDescription): type is DateTypeDescription { return type.$type === 'DateType'; }
// export function isTimeType(type: AtlantisVipTypeDescription): type is TimeTypeDescription { return type.$type === 'TimeType'; }
// export function isDateTimeType(type: AtlantisVipTypeDescription): type is DateTimeTypeDescription { return type.$type === 'DateTimeType'; }
// export function isNumericType(type: AtlantisVipTypeDescription): type is IntegerTypeDescription | FloatTypeDescription {
//     return isIntegerType(type) || isFloatType(type);
// }

// // Add predicate for ArrayTypeDescription
// export function isArrayType(type: AtlantisVipTypeDescription): type is ArrayTypeDescription { return type.$type === 'ArrayType'; }

// /** Helper to convert a grammar TypeReference node to a type description */
// export function grammarTypeToTypeDescription(grammarTypeRef: TypeReference | undefined): AtlantisVipTypeDescription {
//     if (!grammarTypeRef) return UnknownType;

//     // Handle cross-references to defined Types (Record/UserType)
//     if (grammarTypeRef.reference?.ref) {
//         // TODO: Handle Record/UserType properly - requires describing them
//         // For now, treat references as Unknown or create specific Ref descriptions
//         return UnknownType; 
//     }
    
//     // Handle inferred primitive/array types within TypeReference
//     // Need to check which property holds the inferred type based on generated ast.js
//     // Assuming the inferred types are directly available on the TypeReference node itself after generation
//     if (isGrammarIntType(grammarTypeRef)) {
//         return { $type: 'IntegerType', name: grammarTypeRef.name } as IntegerTypeDescription;
//     }
//     if (isGrammarFloatType(grammarTypeRef)) {
//         return { $type: 'FloatType', name: grammarTypeRef.name } as FloatTypeDescription;
//     }
//     if (isGrammarStringType(grammarTypeRef)) {
//         return { $type: 'StringType', name: grammarTypeRef.name } as StringTypeDescription;
//     }
//     if (isGrammarBooleanType(grammarTypeRef)) {
//         return { $type: 'BooleanType', name: grammarTypeRef.name } as BooleanTypeDescription;
//     }
//     if (isGrammarDateType(grammarTypeRef)) {
//         return { $type: 'DateType', name: grammarTypeRef.name } as DateTypeDescription;
//     }
//     if (isGrammarTimeType(grammarTypeRef)) {
//         return { $type: 'TimeType', name: grammarTypeRef.name } as TimeTypeDescription;
//     }
//     if (isGrammarDateTimeType(grammarTypeRef)) {
//         return { $type: 'DateTimeType', name: grammarTypeRef.name } as DateTimeTypeDescription;
//     }
//     if (isGrammarArrayType(grammarTypeRef)) {
//         // Recursively describe the element type
//         const elementTypeDesc = grammarTypeToTypeDescription(grammarTypeRef.arrayType);
//         return { $type: 'ArrayType', name: 'array', elementType: elementTypeDesc } as ArrayTypeDescription;
//     }
    
//     // Fallback if none of the above match (should ideally not happen with current grammar)
//     return UnknownType;
// }

// /** Converts a type description back to a string for display */
// export function typeDescriptionToString(type: AtlantisVipTypeDescription): string {
//     if (isArrayType(type)) {
//         return `array of ${typeDescriptionToString(type.elementType)}`;
//     }
//     return type.name;
// } 