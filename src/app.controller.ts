import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

import { createReadStream, promises } from 'fs';

import { AppResponseDto } from './AppResponseDto';

import sizeOf from 'buffer-image-size';
import { AppService } from './app.service';
import { join } from 'path';

@Controller()
export class AppController {
  private static readonly accptedImageType = ['jpg', 'png', 'jpeg'];
  constructor(private readonly appService: AppService) {}

  @Post('/upload')
  async upload(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply<any>,
  ): Promise<any> {
    if (await this.validateRequest(req, res))
      return await this.appService.upload(req, res);
  }

  @Get('/download/:filename')
  @Header('Content-Type', 'application/zip')
  async download(
    @Param('filename') filename: string,
    @Res() res: FastifyReply<any>,
  ) {
    const data = createReadStream(join(__dirname, '../files', filename));
    res.header('Content-Disposition', 'attachment; filename=' + filename);
    await promises.unlink(join(__dirname, '../files', filename));
    return await res.type('application/zip').send(data);
  }

  private async validateRequest(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply<any>,
  ): Promise<boolean> {
    if (!req.isMultipart()) {
      res.send(
        new BadRequestException(
          new AppResponseDto(400, undefined, 'Request is not multipart'),
        ),
      );
      return;
    }
    const body = req.body;

    if (!req.body) {
      res.send(
        new BadRequestException(
          new AppResponseDto(
            400,
            undefined,
            'no file found please add file and the name of the form parameter',
          ),
        ),
      );
      return false;
    }
    if (Object.keys(body).length > 1) {
      res.send(
        new BadRequestException(
          new AppResponseDto(
            400,
            undefined,
            'number of parameters or files found is more than one',
          ),
        ),
      );
      return false;
    }
    const data = await req.file();

    const buffer = await data.toBuffer();

    // check the file type
    const { fileTypeFromBuffer } = await import('file-type');
    const result = await fileTypeFromBuffer(buffer);
    if (
      !result ||
      !AppController.accptedImageType.includes(result.ext.toLowerCase())
    ) {
      res.send(
        new BadRequestException(
          new AppResponseDto(
            400,
            undefined,
            'file is not an image with type of png or jpg',
          ),
        ),
      );
      return false;
    }
    const dimensions = sizeOf(buffer);
    if (dimensions.width < 768) {
      res.send(
        new BadRequestException(
          new AppResponseDto(
            400,
            undefined,
            'The image width is less than 768px',
          ),
        ),
      );
      return false;
    }
    return true;
  }
}
