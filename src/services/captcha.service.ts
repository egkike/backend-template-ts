import axios from 'axios';

import { config } from '../config';
import { AppError } from '../errors/AppError';
import logger from '../utils/logger';

export class CaptchaService {
  private static readonly VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

  static async verifyToken(token: string): Promise<boolean> {
    // Si estamos en desarrollo y no configuraste la clave, podrías saltarlo
    if (config.nodeEnv === 'development' && !config.recaptchaSecretKey) {
      logger.warn('reCAPTCHA skipped: No secret key configured in development');
      return true;
    }

    if (!token) {
      throw new AppError('Token de seguridad faltante (reCAPTCHA)', 400);
    }

    try {
      const response = await axios.post(this.VERIFY_URL, null, {
        params: {
          secret: config.recaptchaSecretKey,
          response: token,
        },
      });

      const { success, score } = response.data;

      // Log para auditoría interna (opcional)
      logger.info({ success, score }, 'Resultado de verificación reCAPTCHA');

      // Si no fue exitoso o el score es muy bajo (bot)
      if (!success || (score !== undefined && score < 0.5)) {
        return false;
      }

      return true;
    } catch (err: any) {
      // Aquí usamos 'err' para que el linter esté feliz
      logger.error({ error: err.message }, 'Error en comunicación con Google reCAPTCHA');
      throw new AppError('No se pudo completar la validación de seguridad', 500);
    }
  }
}
