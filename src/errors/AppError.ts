// Clase personalizada AppError para lanzar errores con status y mensaje.
// Es una clase personalizada que hereda de la clase nativa Error de JavaScript.
// Su propósito es servir como una forma estandarizada y controlada de lanzar errores

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Mantener el stack trace correcto
    Error.captureStackTrace(this, this.constructor);
  }
}
