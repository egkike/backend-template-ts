import swaggerJsdoc from 'swagger-jsdoc';

import { config } from './config/index';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend Template TS API',
      version: '1.0.0',
      description: `
API REST segura con autenticación JWT y gestión de usuarios.

## Características
- Autenticación con access y refresh tokens
- RBAC con niveles de permisos (USER, STAFF, ADMIN)
- Rate limiting y protección de seguridad
- Validación de contraseñas robusta

## Autenticación
La API usa cookies HttpOnly para almacenar el token de acceso. 
El token se envía automáticamente en las cookies con cada request.
      `.trim(),
      contact: {
        name: 'Soporte',
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
          description: 'JWT access token almacenado en cookie HttpOnly',
        },
      },
      schemas: {
        // Schema base de usuario
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            username: {
              type: 'string',
              example: 'usuario123',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'usuario@ejemplo.com',
            },
            fullname: {
              type: 'string',
              example: 'Juan Pérez',
            },
            level: {
              type: 'number',
              enum: [0, 1, 5, 99],
              description: 'Nivel de permisos: 0=GUEST, 1=USER, 5=STAFF, 99=ADMIN',
              example: 1,
            },
            active: {
              type: 'number',
              enum: [0, 1],
              description: 'Estado de la cuenta: 0=inactivo, 1=activo',
              example: 1,
            },
            mustChangePassword: {
              type: 'boolean',
              description: 'Indica si el usuario debe cambiar su contraseña',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
            },
          },
        },
        // Schema para creación de usuario
        CreateUserRequest: {
          type: 'object',
          required: ['username', 'email', 'password', 'fullname'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              example: 'nuevo_usuario',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'nuevo@ejemplo.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Mínimo 8 caracteres, mayúscula, minúscula, número y símbolo',
              example: 'Password123!',
            },
            fullname: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Juan Pérez',
            },
            level: {
              type: 'number',
              enum: [1, 5, 99],
              default: 1,
              description: 'Nivel de permisos del usuario',
              example: 1,
            },
            captchaToken: {
              type: 'string',
              description: 'Token de reCAPTCHA v3 (requerido en producción)',
            },
          },
        },
        // Schema para login request
        LoginRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'usuario@ejemplo.com',
            },
            username: {
              type: 'string',
              example: 'usuario',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'MiPassword123!',
            },
          },
        },
        // Schema para respuesta de error
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Mensaje de error detallado',
            },
          },
          required: ['success', 'error'],
        },
        // Schema para respuesta exitosa genérica
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operación exitosa',
            },
          },
        },
      },
      // Respuestas reutilizables
      responses: {
        UnauthorizedError: {
          description: 'No autenticado o token inválido',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: 'No token provided',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Permisos insuficientes',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: 'Insufficient permissions',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: 'Usuario no encontrado',
              },
            },
          },
        },
        ValidationError: {
          description: 'Datos de entrada inválidos',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: 'Datos inválidos',
              },
            },
          },
        },
      },
    },
    // Seguridad global - todas las rutas requieren auth por defecto
    // (se puede override en rutas específicas)
    security: [{ cookieAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);
export default swaggerSpecs;
