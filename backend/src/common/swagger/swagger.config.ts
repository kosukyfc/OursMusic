import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('OursMusic API')
    .setDescription(
      'Self-hosted music streaming platform API. Complete REST API documentation for all endpoints.',
    )
    .setVersion('1.0.0')
    .setContact(
      'OursMusic Team',
      'https://github.com/oursmusic/oursmusic',
      'support@oursmusic.com',
    )
    .setLicense('AGPL-3.0', 'https://www.gnu.org/licenses/agpl-3.0.html')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Songs', 'Music management')
    .addTag('Playlists', 'Playlist management')
    .addTag('Favorites', 'Favorite songs')
    .addTag('Search', 'Search functionality')
    .addTag('Admin', 'Admin operations')
    .addTag('Health', 'System health checks')
    .addServer('http://localhost:3000', 'Development')
    .addServer('https://api.oursmusic.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
    },
    customCss: `
      .topbar { display: none; }
      .swagger-ui .topbar-wrapper { display: none; }
    `,
  });
}
