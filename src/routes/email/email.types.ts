import { UserTable } from '../../types/database';

/**
 * Interface for email attachment
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer;
  cid: string; // Content ID for embedding in HTML
}

/**
 * Interface for image to be embedded in email
 */
export interface EmailImage {
  filename: string;
  content: Buffer;
}

/**
 * Interface for email sending results
 */
export interface EmailResult {
  success: boolean;
  error?: any;
  messageId?: string;
}

/**
 * Parameters for sending an email
 */
export interface SendEmailParams {
  title: string;
  message: string;
  users: Pick<UserTable, 'email'>[]; 
  image?: EmailImage;
}

/**
 * Parameters for sending a bulk email
 */
export interface SendBulkEmailParams {
  title: string;
  message: string;
  users: Pick<UserTable, 'email'>[]; 
  image?: EmailImage;
}

/**
 * Parameters for sending a test email
 */
export interface SendTestEmailParams {
  recipient: string;
}

/**
 * Parameters for sending a password reset email
 */
export interface SendPasswordResetEmailParams {
  recipientEmail: string;
  username: string;
  challengeCode: string;
} 