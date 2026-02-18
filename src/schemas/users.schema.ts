import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid().optional(),
  // Lo hacemos opcional porque el backend lo generará automáticamente
  username: z.string().min(4).max(20).optional(),
  password: z.string().min(8, { message: 'Password debe tener al menos 8 caracteres' }),
  email: z.string().email({ message: 'Email inválido' }),
  fullname: z.string().min(4, { message: 'Fullname debe tener al menos 4 caracteres' }).max(255),
  level: z.number().int().min(0).max(99).default(1),
  active: z.number().int().min(0).max(1).default(0),
});

export type UserInput = z.infer<typeof userSchema>;

export function validateUser(input: unknown) {
  return userSchema.safeParse(input);
}

/**
 * Ahora validatePartialUser ya no dará error si falta el username,
 * lo cual es ideal para el login y el registro simplificado.
 */
export function validatePartialUser(input: unknown) {
  return userSchema.partial().safeParse(input);
}

export function validatePasswordDetailed(value: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (value.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  if (!/[a-z]/.test(value)) {
    errors.push('Debe contener al menos una letra minúscula');
  }
  if (!/[A-Z]/.test(value)) {
    errors.push('Debe contener al menos una letra mayúscula');
  }
  if (!/[0-9]/.test(value)) {
    errors.push('Debe contener al menos un número');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value)) {
    errors.push('Debe contener al menos un carácter especial (ej: !@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
