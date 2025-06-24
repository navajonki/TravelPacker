import Mailjet from 'node-mailjet';

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

class MailjetService {
  private mailjet: any;
  private isConfigured: boolean = false;

  constructor() {
    if (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) {
      this.mailjet = new Mailjet({
        apiKey: process.env.MAILJET_API_KEY,
        apiSecret: process.env.MAILJET_SECRET_KEY
      });
      this.isConfigured = true;
      console.log('Mailjet service initialized');
    } else {
      console.warn('MAILJET_API_KEY or MAILJET_SECRET_KEY not configured. Mailjet functionality disabled.');
      this.isConfigured = false;
    }
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('Mailjet not configured');
      return false;
    }

    try {
      const request = this.mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: params.from,
              Name: 'TravelPack'
            },
            To: [
              {
                Email: params.to
              }
            ],
            Subject: params.subject,
            TextPart: params.text,
            HTMLPart: params.html
          }
        ]
      });

      const result = await request;
      return result.response.status === 200;
    } catch (error) {
      console.error('Mailjet email error:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string): Promise<boolean> {
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

    const senderEmail = process.env.MAILJET_SENDER_EMAIL || 'noreply@yourdomain.com';
    
    return await this.sendEmail({
      to: email,
      from: senderEmail,
      subject: 'Reset Your Password - TravelPack',
      text: textContent,
      html: htmlContent,
    });
  }
}

export const mailjetService = new MailjetService();