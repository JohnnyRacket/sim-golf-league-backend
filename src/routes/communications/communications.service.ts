import { db } from '../../db';
import { NotFoundError } from '../../utils/errors';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';
import { emailService } from '../email/email.service';

interface CreateCommunicationParams {
  recipientType: 'league' | 'team' | 'user';
  recipientId: string;
  type: 'system' | 'league' | 'maintenance' | 'advertisement' | 'schedule';
  title: string;
  message: string;
  expirationDate?: Date;
  senderId?: string | null;
}

interface SendEmailCommunicationParams {
  title: string;
  message: string;
  recipientType: 'league' | 'team' | 'user';
  recipientId: string;
  senderId?: string | null;
  saveToDb?: boolean;
  includeImage?: {
    filename: string;
    content: Buffer;
  };
}

// Initialize notifications service
const notificationsService = new NotificationsService(db);

export async function getCommunications() {
  return db.selectFrom('communications')
    .selectAll()
    .execute();
}

export async function getCommunicationsForLeague(leagueId: string) {
  return db.selectFrom('communications')
    .selectAll()
    .where('recipient_type', '=', 'league')
    .where('recipient_id', '=', leagueId)
    .orderBy('created_at', 'desc')
    .execute();
}

export async function getCommunicationById(id: string) {
  const communication = await db.selectFrom('communications')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

  if (!communication) {
    throw new NotFoundError(`Communication with ID ${id} not found`);
  }

  return communication;
}

export async function createCommunication(params: CreateCommunicationParams) {
  const {
    recipientType,
    recipientId,
    type,
    title,
    message,
    expirationDate,
    senderId
  } = params;

  // Generate a UUID for the new communication
  const id = uuidv4();

  // Insert the communication
  const [newCommunication] = await db.insertInto('communications')
    .values({
      id,
      sender_id: senderId === null ? null : senderId,
      recipient_type: recipientType,
      recipient_id: recipientId,
      type,
      title,
      message,
      expiration_date: expirationDate,
    })
    .returningAll()
    .execute();

  // If communication is for a league, notify all league members
  if (recipientType === 'league') {
    await notifyLeagueMembers(recipientId, title, message, type, newCommunication.id);
  }

  return newCommunication;
}

export async function deleteCommunication(id: string) {
  const communication = await getCommunicationById(id);

  await db.deleteFrom('communications')
    .where('id', '=', id)
    .execute();

  return { message: 'Communication deleted successfully', deletedCommunication: communication };
}

/**
 * Send a communication via email to users
 * @param params - Email communication parameters
 * @returns Result of the email sending operation
 */
export async function sendEmailCommunication(params: SendEmailCommunicationParams) {
  const {
    title,
    message,
    recipientType,
    recipientId,
    senderId,
    saveToDb = true,
    includeImage
  } = params;

  // Get recipients based on the type
  let recipientEmails: { email: string }[] = [];

  if (recipientType === 'league') {
    // Get all league members' emails
    const leagueMembers = await db.selectFrom('league_members')
      .innerJoin('users', 'users.id', 'league_members.user_id')
      .select('users.email')
      .where('league_members.league_id', '=', recipientId)
      .execute();
    
    recipientEmails = leagueMembers;
  } else if (recipientType === 'team') {
    // Get all team members' emails
    const teamMembers = await db.selectFrom('team_members')
      .innerJoin('users', 'users.id', 'team_members.user_id')
      .select('users.email')
      .where('team_members.team_id', '=', recipientId)
      .execute();
    
    recipientEmails = teamMembers;
  } else if (recipientType === 'user') {
    // Get the specific user's email
    const user = await db.selectFrom('users')
      .select('email')
      .where('id', '=', recipientId)
      .executeTakeFirst();
    
    if (user) {
      recipientEmails = [user];
    }
  }

  // Save to database if requested
  let communicationId: string | undefined;
  if (saveToDb) {
    const newCommunication = await createCommunication({
      recipientType,
      recipientId,
      type: 'system', // Default type for email communications
      title,
      message,
      senderId
    });
    
    communicationId = newCommunication.id;
  }

  // Send the email
  const emailResult = await emailService.sendBulkEmail({
    title,
    message,
    users: recipientEmails,
    image: includeImage
  });

  return {
    success: emailResult.success,
    error: emailResult.error,
    communicationId,
    recipients: recipientEmails.length
  };
}

async function notifyLeagueMembers(leagueId: string, title: string, body: string, type: string, communicationId: string) {
  // Get all league members
  const leagueMembers = await db.selectFrom('league_members')
    .select('user_id')
    .where('league_id', '=', leagueId)
    .execute();

  // Create a notification for each league member
  for (const member of leagueMembers) {
    await notificationsService.createNotification({
      user_id: member.user_id,
      title: `New ${type} Communication: ${title}`,
      body,
      type: 'system_message',
      action_id: communicationId // Now we can use the communication ID directly as it's a UUID
    });
  }
} 