import {Transform} from 'class-transformer';

/**
 * Trims and lowercases an email field.
 * The pipe handles trimming globally; this decorator adds the lowercase
 * normalisation that is specific to email fields.
 * Apply on every @IsEmail() property in your DTOs.
 */
export function NormalizeEmail() {
    return Transform(({value}) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    );
}
