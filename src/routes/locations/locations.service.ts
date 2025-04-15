import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../../types/database';
import { LocationBasic, LocationDetail, OwnerInfo } from './locations.types';

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
   * Get location by ID with owner details
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
      
      // Get owner info
      const owner = await this.db.selectFrom('owners')
        .select(['id', 'name', 'user_id'])
        .where('id', '=', location.owner_id)
        .executeTakeFirst() as OwnerInfo | undefined;
      
      if (!owner) {
        return null;
      }
      
      // Get league count
      const leagueCount = await this.db.selectFrom('leagues')
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .where('location_id', '=', id)
        .executeTakeFirst();
      
      return {
        ...location,
        owner,
        league_count: leagueCount?.count || 0
      };
    } catch (error) {
      throw new Error(`Failed to get location: ${error}`);
    }
  }

  /**
   * Get locations owned by the specified user
   */
  async getLocationsByOwner(userId: string): Promise<LocationBasic[]> {
    try {
      const locations = await this.db.selectFrom('locations')
        .innerJoin('owners', 'owners.id', 'locations.owner_id')
        .selectAll('locations')
        .where('owners.user_id', '=', userId)
        .execute();
      
      return locations as LocationBasic[];
    } catch (error) {
      throw new Error(`Failed to get owner's locations: ${error}`);
    }
  }

  /**
   * Get owner by user ID
   */
  async getOwnerByUserId(userId: string): Promise<OwnerInfo | null> {
    try {
      const owner = await this.db.selectFrom('owners')
        .select(['id', 'name', 'user_id'])
        .where('user_id', '=', userId)
        .executeTakeFirst();
      
      return owner as OwnerInfo | null;
    } catch (error) {
      throw new Error(`Failed to get owner: ${error}`);
    }
  }

  /**
   * Check if user is the owner of a location
   */
  async isUserLocationOwner(locationId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.selectFrom('locations')
        .innerJoin('owners', 'owners.id', 'locations.owner_id')
        .select('owners.user_id')
        .where('locations.id', '=', locationId)
        .executeTakeFirst();
      
      return !!result && result.user_id.toString() === userId;
    } catch (error) {
      throw new Error(`Failed to check if user is location owner: ${error}`);
    }
  }

  /**
   * Create owner for a user if it doesn't exist
   */
  async createOwnerIfNeeded(userId: string, name: string): Promise<string> {
    try {
      // Check if owner already exists
      const existingOwner = await this.getOwnerByUserId(userId);
      
      if (existingOwner) {
        return existingOwner.id;
      }
      
      // Create new owner
      const ownerId = uuidv4();
      
      await this.db.insertInto('owners')
        .values({
          id: ownerId,
          user_id: userId,
          name
        })
        .execute();
      
      return ownerId;
    } catch (error) {
      throw new Error(`Failed to create owner: ${error}`);
    }
  }

  /**
   * Create a new location
   */
  async createLocation(
    ownerId: string, 
    data: { name: string; address: string; }
  ): Promise<LocationBasic> {
    try {
      const { name, address } = data;
      
      const locationId = uuidv4();
      
      const result = await this.db.insertInto('locations')
        .values({
          id: locationId,
          owner_id: ownerId,
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