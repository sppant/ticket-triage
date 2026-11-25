import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/** Validates a request body against a Zod schema; 400 on failure without echoing input values. */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid ticket',
        errors: result.error.issues.map((i) => ({ field: i.path.join('.'), issue: i.message })),
      });
    }
    return result.data;
  }
}
