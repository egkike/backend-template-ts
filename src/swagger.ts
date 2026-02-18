import swaggerJsdoc from 'swagger-jsdoc';

import { config } from './config/index';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Crema Fintech API',
      version: '1.0.0',
      description: 'API para gestión de productos digitales, comisiones y retiros.',
      contact: {
        name: 'Soporte Crema',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Servidor local (development)',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
          description: 'JWT access token en cookie HttpOnly',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Mensaje de error' },
          },
          required: ['success', 'error'],
        },
      },
    },
    // Esto aplica seguridad global a todos los endpoints en la UI de Swagger
    security: [{ cookieAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);
export default swaggerSpecs;
