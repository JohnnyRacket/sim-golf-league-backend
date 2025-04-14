import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../../types/database';
import { LocationBasic, LocationDetail, ManagerInfo } from './locations.types';

export class LocationsService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Get all locations
   */
  async getAllLocations(): Promise<LocationBasic[]> {
    try {
      const locations = await this.db.selectFrom('locations')
        .selectAll()
        .execute();
      
      return locations as LocationBasic[];
    } catch (error) {
      throw new Error(`Failed to get locations: ${error}`);
    }
  }

  /**
   * Get location by ID with manager details
   */
  async getLocationById(id: string): Promise<LocationDetail | null> {
    try {
      const location = await this.db.selectFrom('locations')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst() as LocationBasic | undefined;
      
      if (!location) {
        return null;
      }
      
      // Get manager info
      const manager = await this.db.selectFrom('managers')
        .select(['id', 'name', 'user_id'])
        .where('id', '=', location.manager_id)
        .executeTakeFirst() as ManagerInfo | undefined;
      
      if (!manager) {
        return null;
      }
      
      // Get league count
      const leagueCount = await this.db.selectFrom('leagues')
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .where('location_id', '=', id)
        .executeTakeFirst();
      
      return {
        ...location,
        manager,
        league_count: leagueCount?.count || 0
      };
    } catch (error) {
      throw new Error(`Failed to get location: ${error}`);
    }
  }

  /**
   * Get locations managed by the specified user
   */
  async getLocationsByManager(userId: string): Promise<LocationBasic[]> {
    try {
      const locations = await this.db.selectFrom('locations')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .selectAll('locations')
        .where('managers.user_id', '=', userId)
        .execute();
      
      return locations as LocationBasic[];
    } catch (error) {
      throw new Error(`Failed to get manager's locations: ${error}`);
    }
  }

  /**
   * Get manager by user ID
   */
  async getManagerByUserId(userId: string): Promise<ManagerInfo | null> {
    try {
      const manager = await this.db.selectFrom('managers')
        .select(['id', 'name', 'user_id'])
        .where('user_id', '=', userId)
        .executeTakeFirst();
      
      return manager as ManagerInfo | null;
    } catch (error) {
      throw new Error(`Failed to get manager: ${error}`);
    }
  }

  /**
   * Check if user is the manager of a location
   */
  async isUserLocationManager(locationId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.selectFrom('locations')
        .innerJoin('managers', 'managers.id', 'locations.manager_id')
        .select('managers.user_id')
        .where('locations.id', '=', locationId)
        .executeTakeFirst();
      
      return !!result && result.user_id.toString() === userId;
    } catch (error) {
      throw new Error(`Failed to check if user is location manager: ${error}`);
    }
  }

  /**
   * Create manager for a user if it doesn't exist
   */
  async createManagerIfNeeded(userId: string, name: string): Promise<string> {
    try {
      // Check if manager already exists
      const existingManager = await this.getManagerByUserId(userId);
      
      if (existingManager) {
        return existingManager.id;
      }
      
      // Create new manager
      const managerId = uuidv4();
      
      await this.db.insertInto('managers')
        .values({
          id: managerId,
          user_id: userId,
          name
        })
        .execute();
      
      return managerId;
    } catch (error) {
      throw new Error(`Failed to create manager: ${error}`);
    }
  }

  /**
   * Create a new location
   */
  async createLocation(
    managerId: string, 
    data: { name: string; address: string; }
  ): Promise<LocationBasic> {
    try {
      const { name, address } = data;
      
      const locationId = uuidv4();
      
      const result = await this.db.insertInto('locations')
        .values({
          id: locationId,
          manager_id: managerId,
          name,
          address
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      
      return result as LocationBasic;
    } catch (error) {
      throw new Error(`Failed to create location: ${error}`);
    }
  }

  /**
   * Update an existing location
   */
  async updateLocation(
    id: string, 
    data: { name?: string; address?: string; }
  ): Promise<LocationBasic | null> {
    try {
      const result = await this.db.updateTable('locations')
        .set(data)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();
      
      return result as LocationBasic | null;
    } catch (error) {
      throw new Error(`Failed to update location: ${error}`);
    }
  }

  /**
   * Delete a location
   */
  async deleteLocation(id: string): Promise<boolean> {
    try {
      // Check if location has leagues
      const leagueCount = await this.db.selectFrom('leagues')
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .where('location_id', '=', id)
        .executeTakeFirst();
      
      if ((leagueCount?.count || 0) > 0) {
        throw new Error('Cannot delete location with associated leagues');
      }
      
      const result = await this.db.deleteFrom('locations')
        .where('id', '=', id)
        .execute();
      
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete location: ${error}`);
    }
  }
} 