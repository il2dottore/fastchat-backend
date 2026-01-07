import { HttpException, HttpStatus } from '@nestjs/common';

function response(success: boolean, message: string, data: any = {}) {
  return {
    success,
    message,
    data
  };
}

export function error(message: string, data: any = {}) {
  return new HttpException(response(false, message, data), HttpStatus.BAD_REQUEST);;
}

export function success(message: string, data: any = {}) {
  return response(true, message, data);
}