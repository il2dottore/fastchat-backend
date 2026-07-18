import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() { }
  @Get()
  getIndex() {
    return {
      success: true,
      date: new Date,
      message: 'v1.0.2 deployed'
    };
  }
}
