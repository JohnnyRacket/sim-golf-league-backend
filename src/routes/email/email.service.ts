import nodemailer from 'nodemailer';
import { logger } from '../../utils/logger';
import { 
  EmailAttachment, 
  EmailResult, 
  SendEmailParams, 
  SendBulkEmailParams, 
  SendTestEmailParams,
  SendPasswordResetEmailParams
} from './email.types';

/**
 * Service for sending email communications
 */
export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  
  constructor() {
    // Initialize the email configuration
    this.fromEmail = process.env.EMAIL_ADDRESS || 'golfsimulatorleague@gmail.com';
    
    // Create a nodemailer transporter using Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.fromEmail,
        pass: process.env.EMAIL_PASSWORD || '',
      },
      secure: true,
    });
    
    // Verify connection configuration
    this.verifyConnection();
  }
  
  /**
   * Verify the email connection is working properly
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('Email service ready to send messages');
    } catch (error) {
      logger.error('Email service configuration error:', error);
    }
  }
  
  /**
   * Send an email to multiple users
   * @param params - Email parameters
   * @returns Promise with send results
   */
  public async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    try {
      const { title, message, users, image } = params;
      
      // Verify we have recipients
      if (!users || users.length === 0) {
        logger.warn('No recipients provided for email');
        return { success: false, error: 'No recipients provided' };
      }
      
      // Get all recipient emails, filtering out any empty ones
      const recipients = users
        .map(user => user.email)
        .filter(email => email && email.trim().length > 0);
      
      if (recipients.length === 0) {
        logger.warn('No valid recipient emails provided');
        return { success: false, error: 'No valid recipient emails' };
      }
      
      // Configure attachments if an image is provided
      const attachments: EmailAttachment[] = [];
      if (image) {
        attachments.push({
          filename: image.filename,
          content: image.content,
          cid: `image-${Date.now()}` // Unique content ID
        });
        
        // Replace image references in the message with the embedded image
        const messageWithImage = message.replace(
          /\[EMBED_IMAGE\]/g, 
          `<img src="cid:${attachments[0].cid}" alt="Embedded Image" style="max-width: 100%;" />`
        );
        
        // Use the updated message with image
        const info = await this.sendFormattedEmail(
          title,
          messageWithImage,
          recipients,
          attachments
        );
        
        return { success: true, messageId: info.messageId };
      } else {
        // Send without image
        const info = await this.sendFormattedEmail(
          title,
          message,
          recipients
        );
        
        return { success: true, messageId: info.messageId };
      }
    } catch (error) {
      logger.error('Error sending email:', error);
      return { success: false, error };
    }
  }
  
  /**
   * Send a test email to verify the service is working
   * @param params - Test email parameters
   * @returns Promise with the result
   */
  public async sendTestEmail(params: SendTestEmailParams): Promise<EmailResult> {
    try {
      const { recipient } = params;
      
      const mailOptions = {
        from: `"Golf Simulator League" <${this.fromEmail}>`,
        to: recipient,
        subject: 'Test Email from Golf Simulator League',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2c3e50;">Golf Simulator League</h1>
            <p>This is a test email to verify that the email service is working correctly.</p>
            <p>If you received this email, the service is properly configured.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0;">Thank you,<br>Golf Simulator League Team</p>
            </div>
          </div>
        `,
      };
      
      // Send the email
      const info = await this.transporter.sendMail(mailOptions);
      const messageId = info.messageId;
      logger.info(`Test email sent: ${messageId}`);
      
      return { success: true, messageId };
    } catch (error) {
      logger.error('Error sending test email:', error);
      return { success: false, error };
    }
  }
  
  /**
   * Send a bulk email with BCC for better privacy
   * @param params - Bulk email parameters
   * @returns Promise with send results
   */
  public async sendBulkEmail(params: SendBulkEmailParams): Promise<EmailResult> {
    try {
      const { title, message, users, image } = params;
      
      if (!users || users.length === 0) {
        return { success: false, error: 'No recipients provided' };
      }
      
      // Get all recipient emails
      const recipients = users
        .map(user => user.email)
        .filter(email => email && email.trim().length > 0);
      
      if (recipients.length === 0) {
        return { success: false, error: 'No valid recipient emails' };
      }
      
      // Configure attachments if an image is provided
      const attachments: EmailAttachment[] = [];
      if (image) {
        attachments.push({
          filename: image.filename,
          content: image.content,
          cid: `image-${Date.now()}` // Unique content ID
        });
        
        // Replace image references in the message with the embedded image
        const messageWithImage = message.replace(
          /\[EMBED_IMAGE\]/g, 
          `<img src="cid:${attachments[0].cid}" alt="Embedded Image" style="max-width: 100%;" />`
        );
        
        // Send with BCC for privacy
        const info = await this.sendBccEmail(
          title,
          messageWithImage,
          recipients,
          attachments
        );
        
        logger.info(`Bulk email sent: ${info.messageId} to ${recipients.length} recipients`);
        return { success: true, messageId: info.messageId };
      } else {
        // Send without image
        const info = await this.sendBccEmail(
          title,
          message,
          recipients
        );
        
        logger.info(`Bulk email sent: ${info.messageId} to ${recipients.length} recipients`);
        return { success: true, messageId: info.messageId };
      }
    } catch (error) {
      logger.error('Error sending bulk email:', error);
      return { success: false, error };
    }
  }
  
  /**
   * Helper method to send a regular email
   */
  private async sendFormattedEmail(
    title: string,
    message: string,
    recipients: string[],
    attachments: EmailAttachment[] = []
  ): Promise<nodemailer.SentMessageInfo> {
    // Determine if message is HTML
    const isHtml = message.includes('<') && message.includes('>');
    
    // Prepare the mail options
    const mailOptions = {
      from: `"Golf Simulator League" <${this.fromEmail}>`,
      to: recipients.join(','),
      subject: title,
      ...(isHtml ? { html: message } : { text: message }),
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    
    // Send the email
    return await this.transporter.sendMail(mailOptions);
  }
  
  /**
   * Helper method to send a BCC email for privacy
   */
  private async sendBccEmail(
    title: string,
    message: string,
    recipients: string[],
    attachments: EmailAttachment[] = []
  ): Promise<nodemailer.SentMessageInfo> {
    // Determine if message is HTML
    const isHtml = message.includes('<') && message.includes('>');
    
    // Prepare the mail options with BCC
    const mailOptions = {
      from: `"Golf Simulator League" <${this.fromEmail}>`,
      bcc: recipients.join(','), // Using BCC for recipient privacy
      subject: title,
      ...(isHtml ? { html: message } : { text: message }),
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    
    // Send the email
    return await this.transporter.sendMail(mailOptions);
  }
  
  /**
   * Send a password reset email with a challenge code
   * @param params - Password reset parameters
   * @returns Promise with the result
   */
  public async sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<EmailResult> {
    try {
      const { recipientEmail, username, challengeCode } = params;
      
      // Format the challenge code for better readability
      const formattedCode = challengeCode.split('').join(' ');
      
      const mailOptions = {
        from: `"Golf Simulator League" <${this.fromEmail}>`,
        to: recipientEmail,
        subject: 'Password Reset Request',
        html: `
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
        `,
      };
      
      // Send the password reset email
      const info = await this.transporter.sendMail(mailOptions);
      const messageId = info.messageId;
      logger.info(`Password reset email sent to ${recipientEmail}: ${messageId}`);
      
      return { success: true, messageId };
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      return { success: false, error };
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService(); 