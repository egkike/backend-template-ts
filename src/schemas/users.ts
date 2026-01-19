import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid().optional(), // opcional porque al crear no lo tenemos
  username: z.string().min(4, { message: 'Username debe tener al menos 4 caracteres' }).max(20),
  password: z.string().min(6, { message: 'Password debe tener al menos 6 caracteres' }),
  email: z.string().email({ message: 'Email inválido' }),
  fullname: z.string().min(4, { message: 'Fullname debe tener al menos 4 caracteres' }).max(255),
  level: z.number().int().min(0).max(10).default(1),
  active: z.number().int().min(0).max(1).default(0),
});

export type UserInput = z.infer<typeof userSchema>;

export function validateUser(input: unknown) {
  return userSchema.safeParse(input);
}

export function validatePartialUser(input: unknown) {
  return userSchema.partial().safeParse(input);
}

/**
 * Valida la contraseña y devuelve Devolver TODOS los errores de una vez de por qué falló (si falla)
 * @returns { valid: true } si está OK, o { valid: false, message: string[] } con las razones específicas
 */
export function validatePasswordDetailed(value: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (value.length < 6) {
    errors.push('La contraseña debe tener al menos 6 caracteres');
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
