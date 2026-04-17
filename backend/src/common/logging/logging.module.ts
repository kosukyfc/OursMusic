import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

@Module({})
export class LoggingModule {
  static forRoot() {
    return {
      module: LoggingModule,
      providers: [
        {
          provide: 'WINSTON_LOGGER',
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const isDev = configService.get('NODE_ENV') !== 'production';
            
            return WinstonModule.createLogger({
              transports: [
                new winston.transports.Console({
                  format: isDev
                    ? winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple(),
                      )
                    : winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json(),
                      ),
                }),
                ...(isDev
                  ? []
                  : [
                      new winston.transports.File({
                        filename: 'logs/error.log',
                        level: 'error',
                        format: winston.format.combine(
                          winston.format.timestamp(),
                          winston.format.errors({ stack: true }),
                          winston.format.json(),
                        ),
                      }),
                      new winston.transports.File({
                        filename: 'logs/combined.log',
                        format: winston.format.combine(
                          winston.format.timestamp(),
                          winston.format.json(),
                        ),
                      }),
                    ]),
              ],
              exceptionHandlers: isDev
                ? undefined
                : [
                    new winston.transports.File({
                      filename: 'logs/exceptions.log',
                    }),
                  ],
            });
          },
        },
      ],
      exports: ['WINSTON_LOGGER'],
    };
  }
}
