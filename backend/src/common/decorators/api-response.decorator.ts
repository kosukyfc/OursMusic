import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export function ApiResponseExample(
  statusCode: number,
  description: string,
  type?: any,
) {
  const decorators: MethodDecorator[] = [
    ApiResponse({
      status: statusCode,
      description,
      type,
    }),
  ];

  if (statusCode !== 200) {
    decorators.push(
      ApiResponse({
        status: 500,
        description: 'Internal server error',
      }),
    );
  }

  return applyDecorators(...decorators);
}
