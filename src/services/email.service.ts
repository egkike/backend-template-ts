import nodemailer, { Transporter } from 'nodemailer';

import { config } from '../config/index';
import logger from '../utils/logger';

let transporter: Transporter;

// >>> Inicialización segura del transporte <<<
try {
  if (process.env.NODE_ENV !== 'test') {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: Number(config.smtp.port),
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      // Optimización para evitar timeouts en conexiones lentas
      connectionTimeout: 10000,
    });
  } else {
    // Usamos 'as any' para que en tests no pida todas las propiedades de Nodemailer
    transporter = {
      sendMail: async () => ({ messageId: 'test-id' }),
    } as any;
  }
} catch {
  logger.error('❌ Error crítico inicializando el transporte de Email');
}

export class EmailService {
  private static async send(to: string, subject: string, html: string) {
    if (!transporter) {
      logger.error('❌ Intento de envío de email fallido: Transporter no inicializado');
      return false;
    }
    try {
      const info = await transporter.sendMail({
        from: `"App" <${config.smtp.from}>`, // Nombre personalizado en la bandeja
        to,
        subject,
        html,
      });
      logger.info({ messageId: info.messageId, to }, '📧 Email enviado correctamente');
      return true;
    } catch (error: any) {
      logger.error({ error: error.message }, '❌ Error en el transporte de email');
      return false;
    }
  }

  static async sendVerificationEmail(email: string, fullname: string, token: string) {
    // CORRECCIÓN: Usamos config.frontendUrl que acabamos de ver en tu index.ts
    const verificationLink = `${config.frontendUrl}/verify-account?token=${token}`;

    const html = `
      <h1>Bienvenido a Crema</h1>
      <p>Hola ${fullname}, verifica tu cuenta aquí:</p>
      <a href="${verificationLink}">Activar mi cuenta</a>
    `;
    return this.send(email, 'Verifica tu cuenta', html);
  }

  static async sendSecurityAlert(to: string, subject: string, message: string) {
    const html = `
      <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #d9534f;">Aviso de Crema</h2>
        <p>${message}</p>
        <p style="font-size: 12px; color: #777; margin-top: 20px;">
          Si no reconoces esta actividad, por favor contacta a soporte técnico de inmediato.
        </p>
      </div>
    `;
    return this.send(to, subject, html);
  }

  static async sendResetPasswordEmail(email: string, fullname: string, token: string) {
    const resetLink = `${config.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #2f3542;">Recuperar contraseña</h2>
        <p>Hola <strong>${fullname}</strong>,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Crema.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #ff4757; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
        </div>
        <p style="font-size: 12px; color: #777;">Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `;
    return this.send(email, 'Restablecer tu contraseña - Crema', html);
  }
}
