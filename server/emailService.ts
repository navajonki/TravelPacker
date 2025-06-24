import { MailService } from '@sendgrid/mail';
import { mailjetService } from './mailjetService.js';

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

type EmailProvider = 'mailjet' | 'sendgrid' | 'none';

class EmailService {
  private sendgridService: MailService;
  private provider: EmailProvider = 'none';
  private isConfigured: boolean = false;

  constructor() {
    this.sendgridService = new MailService();
    
    // Try Mailjet first (free option)
    if (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) {
      this.provider = 'mailjet';
      this.isConfigured = true;
      console.log('Email service initialized with Mailjet (free provider)');
    }
    // Fallback to SendGrid if Mailjet not available
    else if (process.env.SENDGRID_API_KEY) {
      this.provider = 'sendgrid';
      this.sendgridService.setApiKey(process.env.SENDGRID_API_KEY);
      this.isConfigured = true;
      console.log('Email service initialized with SendGrid (paid provider)');
    } else {
      console.warn('No email provider configured. Email functionality disabled.');
      console.log('Configure either:');
      console.log('  - Mailjet (free): MAILJET_API_KEY + MAILJET_SECRET_KEY');
      console.log('  - SendGrid (paid): SENDGRID_API_KEY + SENDGRID_SENDER_EMAIL');
      this.isConfigured = false;
    }
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('No email provider configured');
      return false;
    }

    if (this.provider === 'mailjet') {
      return await mailjetService.sendEmail(params);
    } else if (this.provider === 'sendgrid') {
      return await this.sendWithSendGrid(params);
    }

    return false;
  }

  private async sendWithSendGrid(params: EmailParams): Promise<boolean> {
    try {
      await this.sendgridService.send({
        to: params.to,
        from: params.from,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      return true;
    } catch (error) {
      console.error('SendGrid email error:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string): Promise<boolean> {
    if (this.provider === 'mailjet') {
      return await mailjetService.sendPasswordResetEmail(email, resetToken, baseUrl);
    } else if (this.provider === 'sendgrid') {
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Password Reset Request</h2>
          <p>We received a request to reset your password for your TravelPack account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #6B7280; word-break: break-all;">${resetUrl}</p>
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
          </p>
        </div>
      `;

      const textContent = `
        Password Reset Request
        
        We received a request to reset your password for your TravelPack account.
        
        Click this link to reset your password: ${resetUrl}
        
        This link will expire in 1 hour for security purposes.
      `;

      const senderEmail = process.env.SENDGRID_SENDER_EMAIL || 'noreply@yourverifieddomain.com';
      
      return await this.sendEmail({
        to: email,
        from: senderEmail,
        subject: 'Reset Your Password - TravelPack',
        text: textContent,
        html: htmlContent,
      });
    }

    return false;
  }

  getProviderInfo(): { provider: EmailProvider; configured: boolean } {
    return {
      provider: this.provider,
      configured: this.isConfigured
    };
  }
}

export const emailService = new EmailService();