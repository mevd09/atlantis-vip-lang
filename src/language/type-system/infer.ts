import { AstNode } from 'langium';
import {
    BinaryExpression,
    MemberCall,
    UnaryExpression,
    isNumberLiteral,
    isStringLiteral,
    isBooleanLiteral,
    isBinaryExpression,
    isMemberCall,
    isUnaryExpression,
    isNamedElement,
    isArrayType
} from '../generated/ast.js';
import {
    TypeDescription,
    createErrorType,
    createStringTypeDescription,
    createBooleanTypeDescription,
    createNumberTypeDescription,
    createArrayTypeDescription,
    isStringType,
    isBooleanType,
    isNumberType,
    isErrorType,
    isDateType,
    isTimeType,
    isDateTimeType,
    isArrayType as isArrayTypeDesc,
    isRecordType as isRecordTypeDesc,
    isUserType as isUserTypeDesc,
} from './descriptions.js';
import { grammarTypeToTypeDescription } from './descriptions.js';

/**
 * Main entry point for type inference.
 */
export function inferType(node: AstNode | undefined, cache: Map<AstNode, TypeDescription>): TypeDescription {
    if (!node) {
        return createErrorType('Could not infer type for undefined', node);
    }

    const existing = cache.get(node);
    if (existing) {
        return existing;
    }
    
    // Prevent recursive inference errors
    cache.set(node, createErrorType('Recursive definition', node));

    let type: TypeDescription;
    if (isStringLiteral(node)) {
        type = createStringTypeDescription(node);
    } else if (isBooleanLiteral(node)) {
        type = createBooleanTypeDescription(node);
    } else if (isNumberLiteral(node)) {
        type = createNumberTypeDescription(node);
    } else if (isArrayType(node)) {
        // Handle array type inference
        const elementType = node.arrayType ? grammarTypeToTypeDescription(node.arrayType) : createErrorType('Missing array element type', node);
        type = createArrayTypeDescription(elementType, node.rightBound, node.leftBound);
    } else if (isMemberCall(node)) {
        type = inferMemberCallType(node, cache);
    } else if (isUnaryExpression(node)) {
        type = inferUnaryExpressionType(node, cache);
    } else if (isBinaryExpression(node)) {
        type = inferBinaryExpressionType(node, cache);
    } else if ('expression' in node && node.expression && typeof node.expression === 'object' && node.expression !== null && '$type' in node.expression) {
        type = inferType(node.expression as AstNode, cache);
    } else {
        type = createErrorType('Could not infer type', node);
    }

    cache.set(node, type);
    return type;
}

function inferMemberCallType(node: MemberCall, cache: Map<AstNode, TypeDescription>): TypeDescription {
    // For FeatureCall (which is inferred as MemberCall), handle the case where there's no previous
    if (!node.previous) {
        if (!node.element) {
            return createErrorType('Missing element reference', node);
        }

        // Handle self reference
        if (node.element.$refText === 'self') {
            // TODO: Implement self reference type inference
            return createErrorType('Self reference type inference not implemented', node);
        }

        // Handle variable and field references
        if (isNamedElement(node.element.ref)) {
            // TODO: Implement variable and field reference type inference
            // This should look up the type from the scope
            return createErrorType('Variable/field reference type inference not implemented', node);
        }

        return createErrorType('Unknown feature call', node);
    }

    const receiverType = inferType(node.previous, cache);
    if (isErrorType(receiverType)) return receiverType;

    // Handle explicit operation call (function call or array indexing)
    if (node.explicitOperationCall) {
        // Array indexing - when we have a call with a single numeric index argument
        if (isArrayTypeDesc(receiverType) && node.arguments.length === 1) {
            const indexType = inferType(node.arguments[0], cache);
            if (isNumberType(indexType)) {
                // Return the element type of the array
                return receiverType.elementType;
            }
            return createErrorType('Array index must be a number', node);
        }
        
        // Function call handling would go here
        return createErrorType('Function call type inference not implemented', node);
    }

    // Handle property access (no explicit call)
    if (node.element) {
        // Array properties
        if (isArrayTypeDesc(receiverType)) {
            if (node.element.$refText === 'length') {
                return createNumberTypeDescription();
            }
            return createErrorType(`Property '${node.element.$refText}' not found on array type`, node);
        }

        // Handle record field access
        if (isRecordTypeDesc(receiverType)) {
            const fieldName = node.element.$refText;
            if (!fieldName) return createErrorType('Missing field name', node);
            const fieldType = receiverType.fields.get(fieldName);
            return fieldType || createErrorType(`Field '${fieldName}' not found in record`, node);
        }

        // Handle user type member access
        if (isUserTypeDesc(receiverType)) {
            // TODO: Implement user type member access
            return createErrorType('User type member access not implemented', node);
        }
    }

    return createErrorType('Member access not supported for this type', node);
}

function inferUnaryExpressionType(node: UnaryExpression, cache: Map<AstNode, TypeDescription>): TypeDescription {
    const valueType = inferType(node.value, cache);
    if (isErrorType(valueType)) return valueType;

    switch (node.operator) {
        case '-':
            return isNumberType(valueType) ? valueType : createErrorType('Unary minus requires numeric type', node);
        case '+':
            return isNumberType(valueType) ? valueType : createErrorType('Unary plus requires numeric type', node);
        case 'not':
            return isBooleanType(valueType) ? valueType : createErrorType('Logical not requires boolean type', node);
        default:
            return createErrorType('Unknown unary operator', node);
    }
}

function inferBinaryExpressionType(node: BinaryExpression, cache: Map<AstNode, TypeDescription>): TypeDescription {
    const leftType = inferType(node.left, cache);
    const rightType = inferType(node.right, cache);

    if (isErrorType(leftType) || isErrorType(rightType)) {
        return createErrorType('Error in operand types', node);
    }

    const operator = node.operator;

    // Comparison operators
    if (['=', '!=', '<>', '>', '<', '>=', '<='].includes(operator)) {
        const isComparison = (isNumberType(leftType) && isNumberType(rightType)) ||
            (isStringType(leftType) && isStringType(rightType)) ||
            (isDateType(leftType) && isDateType(rightType)) ||
            (isTimeType(leftType) && isTimeType(rightType)) ||
            (isDateTimeType(leftType) && isDateTimeType(rightType)) ||
            (operator === '=' && isBooleanType(leftType) && isBooleanType(rightType));
        return isComparison ? createBooleanTypeDescription() : createErrorType('Incompatible types for comparison', node);
    }

    // Logical operators
    if (['and', 'or'].includes(operator)) {
        return (isBooleanType(leftType) && isBooleanType(rightType)) 
            ? createBooleanTypeDescription()
            : createErrorType('Logical operators require boolean operands', node);
    }

    // Arithmetic operators
    if (['+', '-', '*', '/', '^', 'mod', 'div'].includes(operator)) {
        // String concatenation
        if (operator === '+' && (isStringType(leftType) || isStringType(rightType))) {
            const otherType = isStringType(leftType) ? rightType : leftType;
            return (isStringType(otherType) || isNumberType(otherType) || isBooleanType(otherType))
                ? createStringTypeDescription()
                : createErrorType('Cannot concatenate with string', node);
        }
        // Numeric operations
        return (isNumberType(leftType) && isNumberType(rightType))
            ? createNumberTypeDescription()
            : createErrorType('Arithmetic operators require numeric operands', node);
    }

    return createErrorType('Unknown operator', node);
}

/**
 * Checks if type B can be assigned to type A.
 */
export function isAssignable(typeA: TypeDescription, typeB: TypeDescription): boolean {
    if (isErrorType(typeA) || isErrorType(typeB)) return true;
    if (typeA.$type === typeB.$type) return true;
    
    // Numeric type compatibility
    if (isNumberType(typeA) && isNumberType(typeB)) return true;
    
    // String type compatibility
    if (isStringType(typeA)) {
        return isStringType(typeB) || isNumberType(typeB) || isBooleanType(typeB);
    }
    
    // Date/Time type compatibility
    if (isDateType(typeA) && isDateType(typeB)) return true;
    if (isTimeType(typeA) && isTimeType(typeB)) return true;
    if (isDateTimeType(typeA) && isDateTimeType(typeB)) return true;
    
    // Array type compatibility
    if (isArrayTypeDesc(typeA) && isArrayTypeDesc(typeB)) {
        return isAssignable(typeA.elementType, typeB.elementType);
    }
    
    // Record type compatibility
    if (isRecordTypeDesc(typeA) && isRecordTypeDesc(typeB)) {
        // Record types are compatible if they have the same structure, no need to check names
        for (const [fieldName, fieldType] of typeA.fields) {
            const otherFieldType = typeB.fields.get(fieldName);
            if (!otherFieldType || !isAssignable(fieldType, otherFieldType)) {
                return false;
            }
        }
        return true;
    }
    
    // User type compatibility
    if (isUserTypeDesc(typeA) && isUserTypeDesc(typeB)) {
        return typeA.baseType.$type === typeB.baseType.$type;
    }
    
    return false;
} 