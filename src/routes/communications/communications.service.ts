import { db } from '../../db';
import { NotFoundError } from '../../utils/errors';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';

interface CreateCommunicationParams {
  recipientType: 'league' | 'team' | 'user';
  recipientId: string;
  type: 'system' | 'league' | 'maintenance' | 'advertisement' | 'schedule';
  title: string;
  message: string;
  expirationDate?: Date;
  senderId?: string | null;
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