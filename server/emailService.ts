import { MailService } from '@sendgrid/mail';

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private mailService: MailService;
  private isConfigured: boolean = false;

  constructor() {
    this.mailService = new MailService();
    
    if (process.env.SENDGRID_API_KEY) {
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
      this.isConfigured = true;
    }
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('SendGrid API key not configured');
      return false;
    }

    try {
      await this.mailService.send({
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
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Password Reset Request</h2>
        <p>You requested a password reset for your packing list account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Reset Password</a>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>This link will expire in 1 hour for security purposes.</p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6B7280;">${resetUrl}</p>
      </div>
    `;

    const textContent = `
      Password Reset Request
      
      You requested a password reset for your packing list account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      If you didn't request this password reset, please ignore this email.
      
      This link will expire in 1 hour for security purposes.
    `;

    // Use environment variable for sender email, fallback to a placeholder
    const senderEmail = process.env.SENDGRID_SENDER_EMAIL || 'noreply@yourverifieddomain.com';
    
    return await this.sendEmail({
      to: email,
      from: senderEmail,
      subject: 'Reset Your Password - TravelPack',
      text: textContent,
      html: htmlContent,
    });
  }
}

export const emailService = new EmailService();