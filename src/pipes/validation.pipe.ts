import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  Type,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { error } from 'src/helpers/http.helper';

@Injectable()
export class SussyValidationPipe implements PipeTransform<unknown> {
  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object: object = plainToInstance(metatype, value) as object;
    const errors = await validate(object);
    if (errors.length > 0) {
      const firstMessage = Object.values(errors[0].constraints!)[0];
      throw error(firstMessage);
    }
    return value;
  }

  private toValidate(metatype: Type<unknown>): boolean {
    const types: Type<unknown>[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
