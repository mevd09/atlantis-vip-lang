import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { AtlantisVipAstType, Interface } from './generated/ast.js';
import type { AtlantisVipServices } from './atlantis-vip-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: AtlantisVipServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.AtlantisVipValidator;
    const checks: ValidationChecks<AtlantisVipAstType> = {
        Interface: validator.checkInterface
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class AtlantisVipValidator {
    checkInterface(interface_: Interface, accept: ValidationAcceptor): void {

    }
}
