import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Mounts Swagger UI at /docs and the OpenAPI JSON at /docs-json (AC-A4). */
export function setupDocs(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('ticket-triage')
    .setDescription(
      'Classifies support tickets and drafts replies, routing between local and hosted models.',
    )
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    jsonDocumentUrl: 'docs-json',
  });
}
