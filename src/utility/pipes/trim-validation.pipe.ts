import {
  ArgumentMetadata,
  Injectable,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';

function trimStrings(value: unknown): unknown {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(trimStrings);
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = trimStrings(v);
    }
    return result;
  }
  return value;
}

/**
 * Extends ValidationPipe to trim all string values in request bodies before
 * validation runs. This prevents accidental leading/trailing whitespace on
 * fields like email, name, and password from causing unexpected failures.
 *
 * Applied globally — no per-DTO or per-field annotation required.
 */
@Injectable()
export class TrimValidationPipe extends ValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super(options);
  }

  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<unknown> {
    if (metadata.type === 'body') {
      value = trimStrings(value);
    }
    return super.transform(value, metadata);
  }
}
