import { Controller, Post, Req, Res } from '@nestjs/common';
import fastify = require('fastify');
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/uploadFile')
  async uploadFile(
    @Req() req: fastify.FastifyRequest,
    @Res() res: fastify.FastifyReply<any>,
  ): Promise<any> {
    return await this.appService.uploadFile(req, res);
  }
}
