import { Injectable, Logger } from '@nestjs/common';

import AdmZip = require('adm-zip');
import fastify = require('fastify');
import {
  AppResponseDto,
  OptimazedImageList,
  OptimazedImageResponseDto,
} from './AppResponseDto';
import * as sharp from 'sharp';

import { v4 } from 'uuid';
import { Multipart } from 'fastify-multipart';
import { Cron, CronExpression } from '@nestjs/schedule';
import { readdirSync, statSync, unlink, unlinkSync } from 'fs';
import path = require('path');
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  // upload
  async upload(body: unknown, res: fastify.FastifyReply<any>): Promise<any> {
    //Check request is multipart

    try {
      const data: Multipart = body[Object.keys(body)[0]];

      const buffer = await data.toBuffer();
      const optimazedImageList = await this.filehandler(
        buffer,
        data.filename,
        data.mimetype,
      );
      const optimazedImageResponseDto: OptimazedImageResponseDto = {
        fileName: optimazedImageList.zipfileName,
        htmlCode: await this.createHtmlCode(optimazedImageList),
      };
      res
        .code(200)
        .send(
          new AppResponseDto(
            200,
            optimazedImageResponseDto,
            'Data uploaded successfully',
          ),
        );
    } catch (err) {
      console.error(' failed', err);
      res.code(500).send(new AppResponseDto(500, err, 'Internal server error'));
    }
  }

  //Save files in directory
  async filehandler(
    file: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<OptimazedImageList> {
    try {
      const zip = new AdmZip();
      const optimazedImageList = new OptimazedImageList();
      filename = filename.slice(0, filename.indexOf('.'));

      if (mimetype === 'image/png') {
        optimazedImageList.png = await this.optimazePNG(filename, file, zip);
      } else if (mimetype === 'image/jpeg') {
        optimazedImageList.jpg = await this.optimazeJPG(filename, file, zip);
      }

      optimazedImageList.webp = await this.optimazeWebP(filename, file, zip);

      const zipfilename = v4() + filename;
      zip.writeZip(`files/${zipfilename}.zip`);
      optimazedImageList.zipfileName = zipfilename + '.zip';
      return optimazedImageList;
    } catch (err) {
      console.error('Pipeline failed', err);
    }
  }

  async optimazePNG(
    filename: string,
    file: Buffer,
    zip: AdmZip,
  ): Promise<string[]> {
    const p1 = sharp(file)
      .resize(480)
      .jpeg()
      .toBuffer();

    const p2 = sharp(file)
      .resize(767)
      .jpeg()
      .toBuffer();

    const p11 = await p1;
    const p22 = await p2;
    zip.addFile(`${filename}-480.jpg`, p11);
    zip.addFile(`${filename}-767.jpg`, p22);
    zip.addFile(`${filename}-full.jpg`, file);
    return [
      `${filename}-480.jpg`,
      `${filename}-767.jpg`,
      `${filename}-full.jpg`,
    ];
  }

  async optimazeJPG(
    filename: string,
    file: Buffer,
    zip: AdmZip,
  ): Promise<string[]> {
    const p1 = sharp(file)
      .resize(480)
      .png()
      .toBuffer();

    const p2 = sharp(file)
      .resize(767)
      .png()
      .toBuffer();

    const p11 = await p1;
    const p22 = await p2;
    zip.addFile(`${filename}-480.jpg`, p11);
    zip.addFile(`${filename}-767.jpg`, p22);
    zip.addFile(`${filename}-full.jpg`, file);
    return [
      `${filename}-480.jpg`,
      `${filename}-767.jpg`,
      `${filename}-full.jpg`,
    ];
  }

  async optimazeWebP(
    filename: string,
    file: Buffer,
    zip: AdmZip,
  ): Promise<string[]> {
    const t1 = sharp(file)
      .resize(480)
      .webp()
      .toBuffer();
    const t2 = sharp(file)
      .resize(767)
      .webp()
      .toBuffer();
    const t3 = sharp(file)
      .webp()
      .toBuffer();
    const t11 = await t1;
    const t22 = await t2;
    const t33 = await t3;
    zip.addFile(`${filename}-480.webp`, t11);
    zip.addFile(`${filename}-767.webp`, t22);
    zip.addFile(`${filename}-full.webp`, t33);
    return [
      `${filename}-480.webp`,
      `${filename}-767.webp`,
      `${filename}-full.webp`,
    ];
  }

  async createHtmlCode(
    optimazedImageList: OptimazedImageList,
  ): Promise<string> {
    let htmlCode = `
     <picture>
        <!-- load webp in different sizes if browser supports it -->
        <source media="(max-width: 480px)" srcset="${optimazedImageList.webp[0]}" type="image/webp">
        <source media="(max-width: 767px)" srcset="${optimazedImageList.webp[1]}" type="image/webp">
        <source media="(min-width: 768px)" srcset="${optimazedImageList.webp[2]}" type="image/webp">
`;
    if (optimazedImageList.png && optimazedImageList.png.length > 0) {
      htmlCode =
        htmlCode +
        `
        <!-- load png in different sizes if browser doesn't support webp -->
        <source media="(max-width: 480px)" srcset="${optimazedImageList.png[0]}" type="image/png">
        <source media="(max-width: 767px)" srcset="${optimazedImageList.png[1]}" type="image/png">
        <source media="(min-width: 768px)" srcset="${optimazedImageList.png[2]}" type="image/png">

        <!--  fallback in different sizes, as well as regular src. -->
        <img srcset="${optimazedImageList.png[0]} 480w, ${optimazedImageList.png[1]} 767w" sizes="(max-width: 480px) 480px,
            (max-width: 767px) 768px" src="${optimazedImageList.png[2]}" alt="image description">
`;
    } else if (optimazedImageList.jpg && optimazedImageList.jpg.length > 0) {
      htmlCode =
        htmlCode +
        `
        <!-- load jpg in different sizes if browser doesn't support webp -->
        <source media="(max-width: 480px)" srcset="${optimazedImageList.jpg[0]}" type="image/jpeg">
        <source media="(max-width: 767px)" srcset="${optimazedImageList.jpg[1]}" type="image/jpeg">
        <source media="(min-width: 768px)" srcset="${optimazedImageList.jpg[2]}" type="image/jpeg">

        <!--  fallback in different sizes, as well as regular src. -->
        <img srcset="${optimazedImageList.jpg[0]} 480w, ${optimazedImageList.jpg[1]} 767w" sizes="(max-width: 480px) 480px,
            (max-width: 767px) 768px" src="${optimazedImageList.jpg[2]}" alt="image description">
`;
    }
    htmlCode =
      htmlCode +
      `
     </picture>`;
    return htmlCode;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  RemoveUnDownloadedFiles() {
    this.logger.log('Cron Job RemoveUnDownloadedFiles started');
    const files = readdirSync(path.join(__dirname, '../files/'));
    files.forEach(element => {
      const filePath = path.join(__dirname, '../files', element);
      const fileCreationTime = new Date(statSync(filePath).birthtime).valueOf();
      const currentTime = new Date().valueOf();
      const differenceInMS = currentTime - fileCreationTime;

      const differenceInMinutes = Math.floor(differenceInMS / 1000 / 60);
      if (differenceInMinutes > 15) {
        unlinkSync(filePath);
        this.logger.log(
          `This file has been removed because it didn't download within 15 minutes ${filePath}`,
        );
      }
    });
    this.logger.log('Cron Job RemoveUnDownloadedFiles finished');
  }
}
