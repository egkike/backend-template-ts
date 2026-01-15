import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend Template TS API',
      version: '1.0.0',
      description:
        'API REST con autenticación JWT (access + refresh token), roles, rate limiting y PostgreSQL',
      contact: {
        name: 'Kike Garcia',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
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
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'ID requerido',
            },
            message: {
              type: 'string',
              example: 'Se requiere autenticación (token no presente)',
              description: 'Mensaje adicional opcional',
            },
          },
          required: ['success', 'error'],
        },
        // Puedes agregar más esquemas reutilizables aquí, ej: User, TokenResponse, etc.
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
    tags: [
      { name: 'Auth', description: 'Autenticación y sesión' },
      { name: 'Users', description: 'Operaciones con usuarios (protegidas)' },
      { name: 'Refresh', description: 'Refresco de tokens' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // rutas y controladores donde leer comentarios JSDoc
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

export default swaggerSpecs;
