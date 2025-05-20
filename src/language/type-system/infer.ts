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
    isArrayType,
    isVariable,
    isType,
    isRecord,
    isUserType,
    isView,
    isInterface,
    isVarsOfType,
    Interface
} from '../generated/ast.js';
import {
    TypeDescription,
    createErrorType,
    createStringTypeDescription,
    createBooleanTypeDescription,
    createNumberTypeDescription,
    createArrayTypeDescription,
    createRecordTypeDescription,
    createUserTypeDescription,
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
    isUnknownType,
    createUnknownTypeDescription,
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
    } else if (isVariable(node)) {
        // Handle variable type inference
        type = inferVariableType(node, cache);
    } else if (isRecord(node)) {
        // Handle record type inference
        type = inferRecordType(node, cache);
    } else if (isUserType(node)) {
        // Handle user-defined type inference
        type = inferUserType(node, cache);
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

function inferVariableType(node: AstNode, cache: Map<AstNode, TypeDescription>): TypeDescription {
    if (!isVariable(node) || !node.$container) {
        return createErrorType('Not a valid variable', node);
    }

    // VarsOfType container has a type reference
    if (isVarsOfType(node.$container)) {
        return grammarTypeToTypeDescription(node.$container.type);
    }

    return createErrorType('Could not determine variable type', node);
}

function inferRecordType(node: AstNode, cache: Map<AstNode, TypeDescription>): TypeDescription {
    if (!isRecord(node)) {
        return createErrorType('Not a valid record', node);
    }

    const fieldsMap = new Map<string, TypeDescription>();
    
    // Process all fields of the record
    for (const fieldsOfType of node.fieldsOfTypes) {
        const fieldType = grammarTypeToTypeDescription(fieldsOfType.type);
        
        for (const field of fieldsOfType.fields) {
            fieldsMap.set(field.name, fieldType);
        }
    }
    
    return createRecordTypeDescription(fieldsMap);
}

function inferUserType(node: AstNode, cache: Map<AstNode, TypeDescription>): TypeDescription {
    if (!isUserType(node)) {
        return createErrorType('Not a valid user type', node);
    }

    const baseType = grammarTypeToTypeDescription(node.type);
    if (isErrorType(baseType) || isUnknownType(baseType)) {
        return createErrorType(`Invalid base type for user type '${node.name}'`, node);
    }

    return createUserTypeDescription(baseType);
}

function inferMemberCallType(node: MemberCall, cache: Map<AstNode, TypeDescription>): TypeDescription {
    // Case 1: Direct reference (FeatureCall with no previous element)
    if (!node.previous) {
        if (!node.element) {
            return createErrorType('Missing element reference', node);
        }

        const refText = node.element.$refText;
        const elementRef = node.element.ref;

        // Handle self reference
        if (refText === 'self') {
            return inferSelfReference(node, cache);
        }

        // Handle named element references (variables, types, etc.)
        if (isNamedElement(elementRef)) {
            return inferNamedElementReference(elementRef, cache);
        }

        return createErrorType(`Unknown reference '${refText}'`, node);
    }

    // Case 2: Member access on another expression
    const receiverType = inferType(node.previous, cache);
    if (isErrorType(receiverType)) {
        return receiverType; // Propagate the error
    }

    // Case 2a: Explicit operation call (function call or array indexing)
    if (node.explicitOperationCall) {
        return inferExplicitOperationCall(node, receiverType, cache);
    }

    // Case 2b: Property access (no explicit call)
    if (node.element) {
        return inferPropertyAccess(node, receiverType);
    }

    return createErrorType('Invalid member call', node);
}

/**
 * Handles inference of self references
 */
function inferSelfReference(node: MemberCall, cache: Map<AstNode, TypeDescription>): TypeDescription {
    // Find the containing view or interface
    let container: AstNode | undefined = node;
    while (container && !isView(container) && !isInterface(container)) {
        container = container.$container;
    }
    
    if (isView(container)) {
        return inferViewType(container, cache);
    } else if (isInterface(container)) {
        return inferInterfaceType(container, cache);
    }
    
    return createErrorType('Self reference outside of view or interface', node);
}

/**
 * Handles inference of named element references
 */
function inferNamedElementReference(element: AstNode, cache: Map<AstNode, TypeDescription>): TypeDescription {
    if (isVariable(element)) {
        return inferVariableType(element, cache);
    } else if (isType(element)) {
        if (isRecord(element)) {
            return inferRecordType(element, cache);
        } else if (isUserType(element)) {
            return inferUserType(element, cache);
        }
    }
    
    // For other named elements, infer their type directly
    return inferType(element, cache);
}

/**
 * Handles inference for explicit operation calls like function calls or array indexing
 */
function inferExplicitOperationCall(
    node: MemberCall, 
    receiverType: TypeDescription, 
    cache: Map<AstNode, TypeDescription>
): TypeDescription {
    // Array indexing - when we have a call with a single numeric index argument
    if (isArrayTypeDesc(receiverType) && node.arguments.length === 1) {
        const indexType = inferType(node.arguments[0], cache);
        if (isNumberType(indexType)) {
            return receiverType.elementType;
        }
        return createErrorType('Array index must be a number', node);
    }
    
    // Function calls would be handled here in a more complete implementation
    return createErrorType('Function call type inference not implemented', node);
}

/**
 * Handles inference for property access on different types
 */
function inferPropertyAccess(node: MemberCall, receiverType: TypeDescription): TypeDescription {
    const propertyName = node.element?.$refText;
    if (!propertyName) {
        return createErrorType('Missing property name', node);
    }

    // Array properties
    if (isArrayTypeDesc(receiverType)) {
        if (propertyName === 'length') {
            return createNumberTypeDescription();
        }
        return createErrorType(`Property '${propertyName}' not found on array type`, node);
    }

    // Record field access
    if (isRecordTypeDesc(receiverType)) {
        const fieldType = receiverType.fields.get(propertyName);
        return fieldType || createErrorType(`Field '${propertyName}' not found in record`, node);
    }

    // User type field access - delegate to the base type
    if (isUserTypeDesc(receiverType)) {
        const baseType = receiverType.baseType;
        
        if (isRecordTypeDesc(baseType)) {
            const fieldType = baseType.fields.get(propertyName);
            return fieldType || createErrorType(`Field '${propertyName}' not found in user type`, node);
        }
        
        return createErrorType('User type does not support member access for non-record base types', node);
    }

    return createErrorType(`Type '${receiverType.$type}' does not support property access`, node);
}

function inferViewType(node: AstNode, cache: Map<AstNode, TypeDescription>): TypeDescription {
    // In a more complete implementation, this would construct a record-like type
    // with all the fields from the view
    return createUnknownTypeDescription();
}

function inferInterfaceType(node: Interface, cache: Map<AstNode, TypeDescription>): TypeDescription {
    // In a more complete implementation, this would construct a record-like type 
    // with all the fields and properties of the interface
    return createUnknownTypeDescription();
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
    if (typeA.$type === typeB.$type) {
        // For array types, we need to check element type compatibility
        if (isArrayTypeDesc(typeA) && isArrayTypeDesc(typeB)) {
            return isAssignable(typeA.elementType, typeB.elementType);
        }
        
        // For user-defined types, we need to check base type compatibility
        if (isUserTypeDesc(typeA) && isUserTypeDesc(typeB)) {
            return isAssignable(typeA.baseType, typeB.baseType);
        }
        
        // For record types, we need to check field compatibility
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
        
        // For other types, same type means they are compatible
        return true;
    }
    
    // Numeric type compatibility
    if (isNumberType(typeA) && isNumberType(typeB)) return true;
    
    // String type compatibility - only allow string to string assignment
    if (isStringType(typeA)) {
        return isStringType(typeB);
    }
    
    // Date/Time type compatibility
    if (isDateType(typeA) && isDateType(typeB)) return true;
    if (isTimeType(typeA) && isTimeType(typeB)) return true;
    if (isDateTimeType(typeA) && isDateTimeType(typeB)) return true;
    
    return false;
} 