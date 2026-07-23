import { HttpException, HttpStatus } from '@nestjs/common';

function response(success: boolean, message: string, data: unknown = {}) {
  return {
    success,
    message,
    data,
  };
}

export function error(message: string, data: unknown = {}) {
  return new HttpException(
    response(false, message, data),
    HttpStatus.BAD_REQUEST,
  );
}

export function success(message: string, data: unknown = {}) {
  return response(true, message, data);
}

/**
 * Safely extracts a human-readable message from an unknown thrown value.
 */
export function getErrorMessage(exception: unknown): string {
  if (exception instanceof Error) {
    return exception.message;
  }
  if (typeof exception === 'string') {
    return exception;
  }
  return 'An unexpected error occurred';
}
