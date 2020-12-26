export class AppResponseDto {
  constructor(
    public statusCode: number,
    public data: OptimazedImageResponseDto | any = undefined,
    public message: string = 'Success',
  ) {}
}

export interface OptimazedImageResponseDto {
  htmlCode: string;
  fileName: string;
}
export class OptimazedImageList {
  png: string[] | undefined;
  jpg: string[] | undefined;
  webp: string[];
  zipfileName: string;
}
