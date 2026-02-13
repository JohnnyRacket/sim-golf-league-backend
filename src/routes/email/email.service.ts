import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import { logger } from '../../utils/logger';
import { config } from '../../utils/config';
import {
  EmailResult,
  SendEmailParams,
  SendBulkEmailParams,
  SendTestEmailParams,
  SendPasswordResetEmailParams
} from './email.types';

/**
 * Service for sending email communications.
 * Uses AWS SES in production, logs to console in dev/test.
 */
export class EmailService {
  private sesClient: SESClient | null = null;
  private fromEmail: string;
  private provider: 'ses' | 'console';

  constructor() {
    this.provider = config.email.provider;
    this.fromEmail = config.email.fromAddress;

    if (this.provider === 'ses') {
      this.sesClient = new SESClient({
        region: config.email.awsRegion,
      });
    }
  }

  /**
   * Send an email to multiple users
   */
  public async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    try {
      const { title, message, users } = params;

      if (!users || users.length === 0) {
        logger.warn('No recipients provided for email');
        return { success: false, error: 'No recipients provided' };
      }

      const recipients = users
        .map(user => user.email)
        .filter(email => email && email.trim().length > 0);

      if (recipients.length === 0) {
        logger.warn('No valid recipient emails provided');
        return { success: false, error: 'No valid recipient emails' };
      }

      const messageId = await this.send({
        to: recipients,
        subject: title,
        body: message,
      });

      return { success: true, messageId };
    } catch (error) {
      logger.error('Error sending email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send a test email to verify the service is working
   */
  public async sendTestEmail(params: SendTestEmailParams): Promise<EmailResult> {
    try {
      const { recipient } = params;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2c3e50;">Golf Simulator League</h1>
          <p>This is a test email to verify that the email service is working correctly.</p>
          <p>If you received this email, the service is properly configured.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0;">Thank you,<br>Golf Simulator League Team</p>
          </div>
        </div>
      `;

      const messageId = await this.send({
        to: [recipient],
        subject: 'Test Email from Golf Simulator League',
        body: html,
      });

      logger.info(`Test email sent: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      logger.error('Error sending test email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send a bulk email (uses BCC-equivalent behavior)
   */
  public async sendBulkEmail(params: SendBulkEmailParams): Promise<EmailResult> {
    try {
      const { title, message, users } = params;

      if (!users || users.length === 0) {
        return { success: false, error: 'No recipients provided' };
      }

      const recipients = users
        .map(user => user.email)
        .filter(email => email && email.trim().length > 0);

      if (recipients.length === 0) {
        return { success: false, error: 'No valid recipient emails' };
      }

      // SES supports up to 50 recipients per call; batch if needed
      const batchSize = 50;
      let lastMessageId: string | undefined;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        lastMessageId = await this.send({
          bcc: batch,
          subject: title,
          body: message,
        });
      }

      logger.info(`Bulk email sent to ${recipients.length} recipients`);
      return { success: true, messageId: lastMessageId };
    } catch (error) {
      logger.error('Error sending bulk email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send a password reset email with a challenge code
   */
  public async sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<EmailResult> {
    try {
      const { recipientEmail, username, challengeCode } = params;

      const formattedCode = challengeCode.split('').join(' ');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2c3e50;">Golf Simulator League</h1>
          <p>Hello ${username},</p>
          <p>We received a request to reset your password. Please use the following verification code to complete the process:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <h2 style="font-family: monospace; letter-spacing: 3px; margin: 0; color: #2c3e50;">${formattedCode}</h2>
          </div>
          <p>This code will expire in 30 minutes for security reasons.</p>
          <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0;">Thank you,<br>Golf Simulator League Team</p>
          </div>
        </div>
      `;

      const messageId = await this.send({
        to: [recipientEmail],
        subject: 'Password Reset Request',
        body: html,
      });

      logger.info(`Password reset email sent to ${recipientEmail}: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      return { success: false, error };
    }
  }

  /**
   * Internal send method that routes to SES or console
   */
  private async send(opts: {
    to?: string[];
    bcc?: string[];
    subject: string;
    body: string;
  }): Promise<string | undefined> {
    if (this.provider === 'console') {
      const recipients = opts.to?.join(', ') || opts.bcc?.join(', ') || 'none';
      logger.info(`[Email Console] To: ${recipients} | Subject: ${opts.subject}`);
      logger.info(`[Email Console] Body preview: ${opts.body.substring(0, 200)}...`);
      return `console-${Date.now()}`;
    }

    const isHtml = opts.body.includes('<') && opts.body.includes('>');

    const input: SendEmailCommandInput = {
      Source: `Golf Simulator League <${this.fromEmail}>`,
      Destination: {
        ...(opts.to ? { ToAddresses: opts.to } : {}),
        ...(opts.bcc ? { BccAddresses: opts.bcc } : {}),
      },
      Message: {
        Subject: { Data: opts.subject, Charset: 'UTF-8' },
        Body: isHtml
          ? { Html: { Data: opts.body, Charset: 'UTF-8' } }
          : { Text: { Data: opts.body, Charset: 'UTF-8' } },
      },
    };

    const result = await this.sesClient!.send(new SendEmailCommand(input));
    return result.MessageId;
  }
}

// Export a singleton instance
export const emailService = new EmailService();
