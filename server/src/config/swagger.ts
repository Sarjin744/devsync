import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DevSync API',
      version: '1.0.0',
      description:
        'REST API for DevSync — a full-stack team collaboration platform. ' +
        'Provides endpoints for authentication, project management, task management, ' +
        'real-time chat, notifications, file sharing, and activity tracking.',
      contact: {
        name: 'DevSync Team',
        url: 'https://github.com/devsync',
      },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
      { url: 'https://devsync-api.onrender.com', description: 'Production (Render)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Application): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
