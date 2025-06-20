import { MailService } from '@sendgrid/mail';
import mailchimp from '@mailchimp/mailchimp_transactional';

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

type EmailProvider = 'sendgrid' | 'mailchimp';

class EmailService {
  private sendgridService?: MailService;
  private mailchimpService?: any;
  private provider!: EmailProvider;
  private isConfigured: boolean = false;

  constructor() {
    // Determine which provider to use based on available API keys
    if (process.env.MAILCHIMP_API_KEY) {
      this.provider = 'mailchimp';
      this.mailchimpService = mailchimp(process.env.MAILCHIMP_API_KEY);
      this.isConfigured = true;
      console.log('Email service initialized with Mailchimp Transactional');
    } else if (process.env.SENDGRID_API_KEY) {
      this.provider = 'sendgrid';
      this.sendgridService = new MailService();
      this.sendgridService.setApiKey(process.env.SENDGRID_API_KEY);
      this.isConfigured = true;
      console.log('Email service initialized with SendGrid');
    } else {
      console.warn('No email provider configured. Set either MAILCHIMP_API_KEY or SENDGRID_API_KEY');
      this.isConfigured = false;
    }
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('No email provider configured');
      return false;
    }

    try {
      if (this.provider === 'mailchimp') {
        const result = await this.sendWithMailchimp(params);
        if (!result && process.env.SENDGRID_API_KEY) {
          console.warn('Mailchimp failed, falling back to SendGrid');
          return await this.fallbackToSendGrid(params);
        }
        return result;
      } else {
        return await this.sendWithSendGrid(params);
      }
    } catch (error) {
      console.error(`Email sending failed with ${this.provider}:`, error);
      
      // Fallback to SendGrid if Mailchimp fails and SendGrid is available
      if (this.provider === 'mailchimp' && process.env.SENDGRID_API_KEY) {
        console.warn('Attempting SendGrid fallback after Mailchimp failure');
        return await this.fallbackToSendGrid(params);
      }
      
      return false;
    }
  }

  private async fallbackToSendGrid(params: EmailParams): Promise<boolean> {
    try {
      if (!this.sendgridService) {
        this.sendgridService = new MailService();
        this.sendgridService.setApiKey(process.env.SENDGRID_API_KEY!);
      }
      
      await this.sendgridService.send({
        to: params.to,
        from: params.from,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      
      console.log('Successfully sent email via SendGrid fallback');
      return true;
    } catch (error) {
      console.error('SendGrid fallback also failed:', error);
      return false;
    }
  }

  private async sendWithSendGrid(params: EmailParams): Promise<boolean> {
    if (!this.sendgridService) {
      console.error('SendGrid service not initialized');
      return false;
    }
    
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

  private async sendWithMailchimp(params: EmailParams): Promise<boolean> {
    try {
      const message = {
        html: params.html,
        text: params.text,
        subject: params.subject,
        from_email: params.from,
        from_name: 'TravelPack',
        to: [
          {
            email: params.to,
            type: 'to'
          }
        ],
        headers: {
          'Reply-To': params.from
        }
      };

      const response = await this.mailchimpService.messages.send({ message });
      
      if (response && response[0] && response[0].status === 'sent') {
        return true;
      } else {
        console.error('Mailchimp send failed:', response);
        return false;
      }
    } catch (error) {
      console.error('Mailchimp email error:', error);
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

    // Use environment variable for sender email, with provider-specific fallbacks
    let senderEmail: string;
    if (process.env.SENDGRID_SENDER_EMAIL) {
      senderEmail = process.env.SENDGRID_SENDER_EMAIL;
    } else if (process.env.MAILCHIMP_SENDER_EMAIL) {
      senderEmail = process.env.MAILCHIMP_SENDER_EMAIL;
    } else {
      senderEmail = 'noreply@yourverifieddomain.com';
    }
    
    return await this.sendEmail({
      to: email,
      from: senderEmail,
      subject: 'Reset Your Password - TravelPack',
      text: textContent,
      html: htmlContent,
    });
  }

  getProviderInfo(): { provider: EmailProvider; configured: boolean } {
    return {
      provider: this.provider,
      configured: this.isConfigured
    };
  }
}

export const emailService = new EmailService();