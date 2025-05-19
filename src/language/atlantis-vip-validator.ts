import {
    ValidationAcceptor,
    ValidationChecks,
    ValidationRegistry,
    AstNode
} from 'langium';
import { AtlantisVipAstType, BinaryExpression, MemberCall, UnaryExpression } from './generated/ast.js';
import type { AtlantisVipServices } from './atlantis-vip-module.js';
import {
    isErrorType,
    isNumberType,
    isStringType,
    isBooleanType,
    isDateType,
    isTimeType,
    isDateTimeType,
    TypeDescription
} from './type-system/descriptions.js';
import { inferType } from './type-system/infer.js';

/**
 * Registry for validation checks.
 */
export class AtlantisVipValidationRegistry extends ValidationRegistry {
    constructor(services: AtlantisVipServices) {
        super(services);
        const validator = services.validation.AtlantisVipValidator;
        const checks: ValidationChecks<AtlantisVipAstType> = {
            BinaryExpression: validator.checkBinaryExpression,
            MemberCall: validator.checkMemberCall,
            UnaryExpression: validator.checkUnaryExpression
        };
        this.register(checks, validator);
    }
}

/**
 * Implementation of custom validations.
 */
export class AtlantisVipValidator {
    checkBinaryExpression(expression: BinaryExpression, accept: ValidationAcceptor): void {
        const cache = new Map<AstNode, TypeDescription>();
        const leftType = inferType(expression.left, cache);
        const rightType = inferType(expression.right, cache);

        if (isErrorType(leftType) || isErrorType(rightType)) {
            accept('error', 'Operand has an error type.', { node: isErrorType(leftType) ? expression.left : expression.right });
            return;
        }

        const operator = expression.operator;

        // Check comparison operators
        if (['=', '!=', '<>', '>', '<', '>=', '<='].includes(operator)) {
            const isComparison = (isNumberType(leftType) && isNumberType(rightType)) ||
                (isStringType(leftType) && isStringType(rightType)) ||
                (isDateType(leftType) && isDateType(rightType)) ||
                (isTimeType(leftType) && isTimeType(rightType)) ||
                (isDateTimeType(leftType) && isDateTimeType(rightType)) ||
                (operator === '=' && isBooleanType(leftType) && isBooleanType(rightType));
            if (!isComparison) {
                accept('error', 'Incompatible types for comparison', { node: expression });
            }
            return;
        }

        // Check logical operators
        if (['and', 'or'].includes(operator)) {
            if (!isBooleanType(leftType) || !isBooleanType(rightType)) {
                accept('error', 'Logical operators require boolean operands', { node: expression });
            }
            return;
        }

        // Check arithmetic operators
        if (['+', '-', '*', '/', '^', 'mod', 'div'].includes(operator)) {
            // String concatenation
            if (operator === '+' && (isStringType(leftType) || isStringType(rightType))) {
                const otherType = isStringType(leftType) ? rightType : leftType;
                if (!isStringType(otherType) && !isNumberType(otherType) && !isBooleanType(otherType)) {
                    accept('error', 'Cannot concatenate with string', { node: expression });
                }
                return;
            }
            // Numeric operations
            if (!isNumberType(leftType) || !isNumberType(rightType)) {
                accept('error', 'Arithmetic operators require numeric operands', { node: expression });
            }
            return;
        }
    }

    checkMemberCall(call: MemberCall, accept: ValidationAcceptor): void {
        const cache = new Map<AstNode, TypeDescription>();
        const type = inferType(call, cache);
        
        if (isErrorType(type)) {
            accept('error', type.message, { node: call });
        }
    }

    checkUnaryExpression(expression: UnaryExpression, accept: ValidationAcceptor): void {
        const cache = new Map<AstNode, TypeDescription>();
        const valueType = inferType(expression.value, cache);

        if (isErrorType(valueType)) {
            accept('error', 'Operand has an error type.', { node: expression.value });
            return;
        }

        switch (expression.operator) {
            case '-':
            case '+':
                if (!isNumberType(valueType)) {
                    accept('error', 'Unary plus/minus requires numeric type', { node: expression });
                }
                break;
            case 'not':
                if (!isBooleanType(valueType)) {
                    accept('error', 'Logical not requires boolean type', { node: expression });
                }
                break;
        }
    }
}
