import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { Database, HandednessType } from '../../types/database';
import { LocationBasic, LocationDetail, OwnerInfo } from './locations.types';
import { DatabaseError, ConflictError } from '../../utils/errors';

export interface BayBasic {
  id: string;
  location_id: string;
  bay_number: string;
  max_people: number;
  handedness: HandednessType;
  details?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

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
      
      // Convert PostgreSQL POINT to our format
      return locations.map(location => {
        const result = { ...location } as LocationBasic;
        if (result.coordinates) {
          // PostgreSQL POINT is returned as a string like "(x,y)" - parse it to our format
          const match = /\(([^,]+),([^)]+)\)/.exec(result.coordinates as unknown as string);
          if (match) {
            result.coordinates = {
              x: parseFloat(match[1]),
              y: parseFloat(match[2])
            };
          }
        }
        return result;
      });
    } catch (error) {
      throw new DatabaseError('Failed to get locations', error);
    }
  }

  /**
   * Find coordinates from an address string
   * This is a stub method that would normally call a geocoding service
   */
  async findCoordinatesFromAddress(address: string): Promise<{ x: number; y: number } | null> {
    try {
      // In a real implementation, this would call a geocoding service
      // For now, return mock coordinates
      
      // Generate deterministic but random-looking coordinates based on address string
      // This ensures the same address always gets the same coordinates
      const hash = Array.from(address).reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0);
      
      // Generate latitude (x) between 25 and 50 (roughly covers US)
      const latitude = 25 + (hash % 25);
      
      // Generate longitude (y) between -65 and -125 (roughly covers US)
      const longitude = -65 - (hash % 60);
      
      return {
        x: parseFloat(latitude.toFixed(6)),
        y: parseFloat(longitude.toFixed(6))
      };
    } catch (error) {
      console.error(`Error finding coordinates: ${error}`);
      return null;
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
        .executeTakeFirst();
      
      if (!location) {
        return null;
      }
      
      // Convert location to our expected format
      const locationResult = { ...location } as LocationBasic;
      if (locationResult.coordinates) {
        // PostgreSQL POINT is returned as a string like "(x,y)" - parse it to our format
        const match = /\(([^,]+),([^)]+)\)/.exec(locationResult.coordinates as unknown as string);
        if (match) {
          locationResult.coordinates = {
            x: parseFloat(match[1]),
            y: parseFloat(match[2])
          };
        }
      }
      
      // Get owner info
      const owner = await this.db.selectFrom('owners')
        .select(['id', 'name', 'user_id'])
        .where('id', '=', locationResult.owner_id)
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
        ...locationResult,
        owner,
        league_count: leagueCount?.count || 0
      };
    } catch (error) {
      throw new DatabaseError('Failed to get location', error);
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
      throw new DatabaseError('Failed to get owner\'s locations', error);
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
      throw new DatabaseError('Failed to get owner', error);
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
      throw new DatabaseError('Failed to check if user is location owner', error);
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
      throw new DatabaseError('Failed to create owner', error);
    }
  }

  /**
   * Create a new location
   */
  async createLocation(
    ownerId: string, 
    data: { 
      name: string; 
      address: string; 
      logo_url?: string | null;
      banner_url?: string | null;
      website_url?: string | null;
      phone?: string | null;
      coordinates?: { x: number; y: number } | null;
    }
  ): Promise<LocationBasic> {
    try {
      const { 
        name, 
        address, 
        logo_url = null, 
        banner_url = null, 
        website_url = null, 
        phone = null, 
        coordinates = null 
      } = data;
      
      const locationId = uuidv4();
      
      const result = await this.db.insertInto('locations')
        .values({
          id: locationId,
          owner_id: ownerId,
          name,
          address,
          logo_url,
          banner_url,
          website_url,
          phone,
          coordinates: coordinates ? `(${coordinates.x},${coordinates.y})` : null
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      
      // Transform Point to expected format if coordinates exist
      const location = { ...result } as LocationBasic;
      if (location.coordinates) {
        // PostgreSQL POINT is returned as a string like "(x,y)" - parse it to our format
        const match = /\(([^,]+),([^)]+)\)/.exec(location.coordinates as unknown as string);
        if (match) {
          location.coordinates = {
            x: parseFloat(match[1]),
            y: parseFloat(match[2])
          };
        }
      }
      
      return location;
    } catch (error) {
      throw new DatabaseError('Failed to create location', error);
    }
  }

  /**
   * Update an existing location
   */
  async updateLocation(
    id: string, 
    data: { 
      name?: string; 
      address?: string; 
      logo_url?: string | null;
      banner_url?: string | null;
      website_url?: string | null;
      phone?: string | null;
      coordinates?: { x: number; y: number } | null;
    }
  ): Promise<LocationBasic | null> {
    try {
      // Create a new object with the input data
      const { coordinates, ...rest } = data;
      const updateData: any = { ...rest };
      
      // Handle coordinates conversion to PostgreSQL POINT
      if (coordinates !== undefined) {
        updateData.coordinates = coordinates === null 
          ? null 
          : `(${coordinates.x},${coordinates.y})`;
      }
      
      const result = await this.db.updateTable('locations')
        .set(updateData)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();
      
      if (!result) {
        return null;
      }
      
      // Transform Point to expected format if coordinates exist
      const location = { ...result } as LocationBasic;
      if (location.coordinates) {
        // PostgreSQL POINT is returned as a string like "(x,y)" - parse it to our format
        const match = /\(([^,]+),([^)]+)\)/.exec(location.coordinates as unknown as string);
        if (match) {
          location.coordinates = {
            x: parseFloat(match[1]),
            y: parseFloat(match[2])
          };
        }
      }
      
      return location;
    } catch (error) {
      throw new DatabaseError('Failed to update location', error);
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
        throw new ConflictError('Cannot delete location with associated leagues');
      }
      
      const result = await this.db.deleteFrom('locations')
        .where('id', '=', id)
        .execute();
      
      return !!result;
    } catch (error) {
      throw new DatabaseError('Failed to delete location', error);
    }
  }

  /**
   * Get all bays for a location
   */
  async getBaysByLocation(locationId: string): Promise<BayBasic[]> {
    try {
      const bays = await this.db.selectFrom('bays')
        .selectAll()
        .where('location_id', '=', locationId)
        .execute();
      
      return bays as BayBasic[];
    } catch (error) {
      throw new DatabaseError('Failed to get bays', error);
    }
  }

  /**
   * Get bay by ID
   */
  async getBayById(id: string): Promise<BayBasic | null> {
    try {
      const bay = await this.db.selectFrom('bays')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      
      return bay as BayBasic | null;
    } catch (error) {
      throw new DatabaseError('Failed to get bay', error);
    }
  }

  /**
   * Create a new bay
   */
  async createBay(
    locationId: string,
    data: {
      bay_number: string;
      max_people?: number;
      handedness?: HandednessType;
      details?: Record<string, unknown>;
    }
  ): Promise<BayBasic> {
    try {
      const { bay_number, max_people = 4, handedness = 'both', details = {} } = data;
      
      const bayId = uuidv4();
      
      const result = await this.db.insertInto('bays')
        .values({
          id: bayId,
          location_id: locationId,
          bay_number,
          max_people,
          handedness,
          details
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      
      return result as BayBasic;
    } catch (error) {
      throw new DatabaseError('Failed to create bay', error);
    }
  }

  /**
   * Update an existing bay
   */
  async updateBay(
    id: string,
    data: {
      bay_number?: string;
      max_people?: number;
      handedness?: HandednessType;
      details?: Record<string, unknown>;
    }
  ): Promise<BayBasic | null> {
    try {
      const result = await this.db.updateTable('bays')
        .set(data)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();
      
      return result as BayBasic | null;
    } catch (error) {
      throw new DatabaseError('Failed to update bay', error);
    }
  }

  /**
   * Delete a bay
   */
  async deleteBay(id: string): Promise<boolean> {
    try {
      const result = await this.db.deleteFrom('bays')
        .where('id', '=', id)
        .execute();
      
      return !!result;
    } catch (error) {
      throw new DatabaseError('Failed to delete bay', error);
    }
  }
} 