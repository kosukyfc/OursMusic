import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private configured = false;

  constructor(private readonly config: ConfigService) {
    const user = config.get<string>('MAIL_USER', '');
    const pass = config.get<string>('MAIL_PASS', '');

    if (!user || !pass) {
      this.logger.warn(
        'MAIL_USER ou MAIL_PASS não configurados — e-mails de recuperação de senha não serão enviados. ' +
        'Configure as variáveis no .env para ativar esta funcionalidade.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host:   config.get('MAIL_HOST', 'smtp.gmail.com'),
      port:   Number(config.get('MAIL_PORT', '587')),
      secure: config.get('MAIL_SECURE', 'false') === 'true',
      auth: { user, pass },
    });
    this.configured = true;
  }

  async sendPasswordReset(to: string, resetUrl: string, name?: string) {
    if (!this.configured || !this.transporter) {
      this.logger.error(`[DEV] Link de reset para ${to}: ${resetUrl}`);
      // Em desenvolvimento, loga o link no console em vez de falhar
      return;
    }

    const from = this.config.get('MAIL_FROM', 'OursMusic <noreply@oursmusic.app>');
    const displayName = name ?? 'usuário';

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Redefinição de senha — OursMusic',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#1a1a1a;color:#e5e5e5;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px;text-align:center;">
              <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="7" fill="rgba(255,255,255,0.15)"/>
                <rect x="5"  y="12" width="3" height="8"  rx="1.5" fill="white"/>
                <rect x="10" y="8"  width="3" height="16" rx="1.5" fill="white"/>
                <rect x="15" y="5"  width="3" height="22" rx="1.5" fill="white"/>
                <rect x="20" y="9"  width="3" height="14" rx="1.5" fill="white"/>
                <rect x="25" y="13" width="3" height="6"  rx="1.5" fill="white"/>
              </svg>
              <h1 style="color:#fff;margin:12px 0 0;font-size:22px;font-weight:800;">OursMusic</h1>
            </div>
            <div style="padding:32px;">
              <h2 style="margin:0 0 12px;font-size:18px;">Olá, ${displayName}!</h2>
              <p style="color:#b3b3b3;line-height:1.6;margin:0 0 24px;">
                Recebemos uma solicitação para redefinir a senha da sua conta.<br>
                Clique no botão abaixo para criar uma nova senha. O link expira em <strong style="color:#c4b5fd;">15 minutos</strong>.
              </p>
              <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:14px 32px;border-radius:500px;font-weight:700;font-size:15px;letter-spacing:0.05em;">
                Redefinir senha
              </a>
              <p style="color:#6b7280;font-size:12px;margin:24px 0 0;line-height:1.6;">
                Se você não solicitou a redefinição, ignore este e-mail.<br>
                Ou copie e cole este link no navegador:<br>
                <span style="color:#a78bfa;word-break:break-all;">${resetUrl}</span>
              </p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail para ${to}: ${err}`);
      throw new InternalServerErrorException('Falha ao enviar e-mail. Tente novamente mais tarde.');
    }
  }
}
