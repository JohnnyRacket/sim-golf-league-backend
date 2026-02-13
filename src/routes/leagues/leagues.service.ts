import { Kysely, Updateable } from "kysely";
import { v4 as uuidv4 } from "uuid";
import {
  Database,
  LeagueStatus,
  LeagueMemberRole,
  LeagueRequestStatus,
  PaymentType,
  DayOfWeek,
  SchedulingFormatType,
  PlayoffFormatType,
  HandicapMode,
} from "../../types/database";
import {
  LeagueBasic,
  LeagueDetail,
  LeagueWithLocation,
  LocationInfo,
  OwnerInfo,
  TeamInfo,
  LeagueMember,
} from "./leagues.types";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  DatabaseError,
} from "../../utils/errors";

export class LeaguesService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Get all leagues with optional location filtering
   */
  async getAllLeagues(locationId?: string): Promise<LeagueWithLocation[]> {
    try {
      let query = this.db
        .selectFrom("leagues")
        .leftJoin("locations", "locations.id", "leagues.location_id")
        .leftJoin("owners", "owners.id", "locations.owner_id")
        .select([
          "leagues.id",
          "leagues.name",
          "leagues.location_id",
          "leagues.start_date",
          "leagues.end_date",
          "leagues.description",
          "leagues.max_teams",
          "leagues.simulator_settings",
          "leagues.status",
          "leagues.created_at",
          "leagues.updated_at",
          "locations.name as location_name",
          "owners.name as owner_name",
        ]);

      query = query.where("leagues.status", "!=", "inactive");

      if (locationId) {
        query = query.where("leagues.location_id", "=", locationId);
      }

      const leagues = await query.execute();
      return leagues as LeagueWithLocation[];
    } catch (error) {
      throw new DatabaseError("Failed to get leagues", error);
    }
  }

  /**
   * Get leagues that the user is a member of through team membership
   */
  async getLeaguesByUserMembership(userId: string): Promise<any[]> {
    try {
      const leagues = await this.db
        .selectFrom("team_members")
        .innerJoin("teams", "teams.id", "team_members.team_id")
        .innerJoin("leagues", "leagues.id", "teams.league_id")
        .innerJoin("locations", "locations.id", "leagues.location_id")
        .select([
          "leagues.id",
          "leagues.name",
          "leagues.start_date",
          "leagues.end_date",
          "leagues.status",
          "locations.name as location_name",
          "teams.id as team_id",
          "teams.name as team_name",
        ])
        .where("team_members.user_id", "=", userId)
        .where("team_members.status", "=", "active")
        .where("leagues.status", "!=", "inactive")
        .execute();

      return leagues;
    } catch (error) {
      throw new DatabaseError("Failed to get user's leagues", error);
    }
  }

  /**
   * Get leagues managed by the specified user
   */
  async getLeaguesByManager(userId: string): Promise<LeagueWithLocation[]> {
    try {
      // First, get leagues where the user is a location owner
      const ownerLeagues = await this.db
        .selectFrom("leagues")
        .leftJoin("locations", "locations.id", "leagues.location_id")
        .leftJoin("owners", "owners.id", "locations.owner_id")
        .select([
          "leagues.id",
          "leagues.name",
          "leagues.location_id",
          "leagues.start_date",
          "leagues.end_date",
          "leagues.description",
          "leagues.max_teams",
          "leagues.simulator_settings",
          "leagues.status",
          "leagues.created_at",
          "leagues.updated_at",
          "locations.name as location_name",
          "owners.name as owner_name",
        ])
        .where("owners.user_id", "=", userId)
        .where("leagues.status", "!=", "inactive")
        .execute();

      // Now get leagues where the user has a manager role
      const managerRoleLeagues = await this.db
        .selectFrom("league_members")
        .innerJoin("leagues", "leagues.id", "league_members.league_id")
        .leftJoin("locations", "locations.id", "leagues.location_id")
        .leftJoin("owners", "owners.id", "locations.owner_id")
        .select([
          "leagues.id",
          "leagues.name",
          "leagues.location_id",
          "leagues.start_date",
          "leagues.end_date",
          "leagues.description",
          "leagues.max_teams",
          "leagues.simulator_settings",
          "leagues.status",
          "leagues.created_at",
          "leagues.updated_at",
          "locations.name as location_name",
          "owners.name as owner_name",
        ])
        .where("league_members.user_id", "=", userId)
        .where("league_members.role", "=", "manager")
        .where("leagues.status", "!=", "inactive")
        .execute();

      // Combine and deduplicate results
      const allLeagues = [...ownerLeagues, ...managerRoleLeagues];
      const uniqueLeagues = Array.from(
        new Map(allLeagues.map((league) => [league.id, league])).values(),
      );

      return uniqueLeagues as LeagueWithLocation[];
    } catch (error) {
      throw new DatabaseError("Failed to get manager's leagues", error);
    }
  }

  /**
   * Get league by ID with detailed information
   */
  async getLeagueById(id: string): Promise<LeagueDetail | null> {
    try {
      const league = (await this.db
        .selectFrom("leagues")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst()) as LeagueBasic | undefined;

      if (!league) {
        return null;
      }

      // Get location info
      const location = (await this.db
        .selectFrom("locations")
        .select(["id", "name", "address"])
        .where("id", "=", league.location_id)
        .executeTakeFirst()) as LocationInfo | undefined;

      if (!location) {
        return null;
      }

      // Get owner info
      const owner = (await this.db
        .selectFrom("owners")
        .innerJoin("locations", "locations.owner_id", "owners.id")
        .select(["owners.id", "owners.name", "owners.user_id"])
        .where("locations.id", "=", league.location_id)
        .executeTakeFirst()) as OwnerInfo | undefined;

      // Get teams in the league
      const teams = await this.db
        .selectFrom("teams")
        .select(["id", "name", "max_members"])
        .where("league_id", "=", id)
        .where("status", "=", "active")
        .execute();

      // Get member count for each team
      const teamsWithCount = await Promise.all(
        teams.map(async (team) => {
          const memberCount = await this.db
            .selectFrom("team_members")
            .select(({ fn }) => fn.count<number>("id").as("count"))
            .where("team_id", "=", team.id)
            .where("status", "=", "active")
            .executeTakeFirst();

          return {
            ...team,
            member_count: memberCount?.count || 0,
          };
        }),
      );

      // Get league members
      const members = await this.getLeagueMembers(id);

      return {
        ...league,
        location,
        owner: owner || {
          id: "",
          name: "Unknown",
          user_id: "",
        },
        teams: teamsWithCount as TeamInfo[],
        members,
      };
    } catch (error) {
      throw new DatabaseError("Failed to get league", error);
    }
  }

  /**
   * Check if user is an owner of the location that a league belongs to
   */
  async isUserLocationManager(
    locationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const result = await this.db
        .selectFrom("locations")
        .innerJoin("owners", "owners.id", "locations.owner_id")
        .select("owners.user_id")
        .where("locations.id", "=", locationId)
        .executeTakeFirst();

      return !!result && result.user_id.toString() === userId;
    } catch (error) {
      throw new DatabaseError(
        "Failed to check if user is location owner",
        error,
      );
    }
  }

  /**
   * Check if user is manager of the location that owns the league
   */
  async isUserLeagueManager(
    leagueId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // First check if the user is a location owner for this league
      const isLocationOwner = await this.db
        .selectFrom("leagues")
        .innerJoin("locations", "locations.id", "leagues.location_id")
        .innerJoin("owners", "owners.id", "locations.owner_id")
        .select("owners.user_id")
        .where("leagues.id", "=", leagueId)
        .executeTakeFirst();

      if (isLocationOwner && isLocationOwner.user_id.toString() === userId) {
        return true;
      }

      // Then check if the user has a manager role in the league
      return await this.isUserLeagueMember(leagueId, userId, "manager");
    } catch (error) {
      throw new DatabaseError(
        "Failed to check if user is league manager",
        error,
      );
    }
  }

  /**
   * Check if user is a league member with a specific role
   */
  async isUserLeagueMember(
    leagueId: string,
    userId: string,
    role?: LeagueMemberRole,
  ): Promise<boolean> {
    try {
      let query = this.db
        .selectFrom("league_members")
        .select("id")
        .where("league_id", "=", leagueId)
        .where("user_id", "=", userId);

      if (role) {
        query = query.where("role", "=", role);
      }

      const member = await query.executeTakeFirst();
      return !!member;
    } catch (error) {
      throw new DatabaseError(
        "Failed to check if user is league member",
        error,
      );
    }
  }

  /**
   * Get all members of a league
   */
  async getLeagueMembers(leagueId: string): Promise<LeagueMember[]> {
    try {
      const members = await this.db
        .selectFrom("league_members")
        .innerJoin("users", "users.id", "league_members.user_id")
        .select([
          "league_members.id",
          "league_members.user_id",
          "league_members.role",
          "league_members.joined_at",
          "users.username",
        ])
        .where("league_members.league_id", "=", leagueId)
        .execute();

      return members as LeagueMember[];
    } catch (error) {
      throw new DatabaseError("Failed to get league members", error);
    }
  }

  /**
   * Add a user to a league with a specific role
   */
  async addLeagueMember(
    leagueId: string,
    userId: string,
    role: LeagueMemberRole = "spectator",
  ): Promise<LeagueMember | null> {
    try {
      // Check if user is already a member
      const existingMember = await this.db
        .selectFrom("league_members")
        .selectAll()
        .where("league_id", "=", leagueId)
        .where("user_id", "=", userId)
        .executeTakeFirst();

      if (existingMember) {
        // If role is different, update it
        if (existingMember.role !== role) {
          const updated = await this.db
            .updateTable("league_members")
            .set({ role })
            .where("id", "=", existingMember.id)
            .returningAll()
            .executeTakeFirst();

          return updated as LeagueMember | null;
        }

        return existingMember as LeagueMember;
      }

      // Add new member
      const memberId = uuidv4();

      const result = await this.db
        .insertInto("league_members")
        .values({
          id: memberId,
          league_id: leagueId,
          user_id: userId,
          role,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Get username for the response
      const user = await this.db
        .selectFrom("users")
        .select("username")
        .where("id", "=", userId)
        .executeTakeFirst();

      return {
        ...result,
        username: user?.username || "Unknown",
      } as LeagueMember;
    } catch (error) {
      throw new DatabaseError("Failed to add league member", error);
    }
  }

  /**
   * Update a league member's role
   */
  async updateLeagueMemberRole(
    memberId: string,
    role: LeagueMemberRole,
  ): Promise<LeagueMember | null> {
    try {
      const result = await this.db
        .updateTable("league_members")
        .set({ role })
        .where("id", "=", memberId)
        .returningAll()
        .executeTakeFirst();

      if (!result) {
        return null;
      }

      // Get username for the response
      const user = await this.db
        .selectFrom("users")
        .select("username")
        .where("id", "=", result.user_id)
        .executeTakeFirst();

      return {
        ...result,
        username: user?.username || "Unknown",
      } as LeagueMember;
    } catch (error) {
      throw new DatabaseError("Failed to update league member role", error);
    }
  }

  /**
   * Remove a member from a league
   */
  async removeLeagueMember(memberId: string): Promise<boolean> {
    try {
      const result = await this.db
        .deleteFrom("league_members")
        .where("id", "=", memberId)
        .execute();

      return !!result;
    } catch (error) {
      throw new DatabaseError("Failed to remove league member", error);
    }
  }

  /**
   * Create a league membership request
   */
  async createLeagueMembershipRequest(
    leagueId: string,
    userId: string,
    requestedRole: LeagueMemberRole,
    message?: string,
  ): Promise<any> {
    try {
      // Check if user is already a member with the requested role
      const existingMember = await this.db
        .selectFrom("league_members")
        .selectAll()
        .where("league_id", "=", leagueId)
        .where("user_id", "=", userId)
        .where("role", "=", requestedRole)
        .executeTakeFirst();

      if (existingMember) {
        throw new ConflictError(
          "User already has the requested role in this league",
        );
      }

      // Check for existing pending requests
      const existingRequest = await this.db
        .selectFrom("league_membership_requests")
        .selectAll()
        .where("league_id", "=", leagueId)
        .where("user_id", "=", userId)
        .where("requested_role", "=", requestedRole)
        .where("status", "=", "pending")
        .executeTakeFirst();

      if (existingRequest) {
        throw new ConflictError("A pending request already exists");
      }

      // Create request
      const requestId = uuidv4();

      const result = await this.db
        .insertInto("league_membership_requests")
        .values({
          id: requestId,
          league_id: leagueId,
          user_id: userId,
          requested_role: requestedRole,
          status: "pending",
          message,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return result;
    } catch (error) {
      if (error instanceof ConflictError) throw error;
      throw new DatabaseError(
        "Failed to create league membership request",
        error,
      );
    }
  }

  /**
   * Get pending membership requests for a league
   */
  async getLeagueMembershipRequests(
    leagueId: string,
    status: LeagueRequestStatus = "pending",
  ): Promise<any[]> {
    try {
      const requests = await this.db
        .selectFrom("league_membership_requests")
        .innerJoin("users", "users.id", "league_membership_requests.user_id")
        .select([
          "league_membership_requests.id",
          "league_membership_requests.user_id",
          "league_membership_requests.requested_role",
          "league_membership_requests.message",
          "league_membership_requests.created_at",
          "users.username",
        ])
        .where("league_membership_requests.league_id", "=", leagueId)
        .where("league_membership_requests.status", "=", status)
        .execute();

      return requests;
    } catch (error) {
      throw new DatabaseError(
        "Failed to get league membership requests",
        error,
      );
    }
  }

  /**
   * Get membership requests created by a user
   */
  async getUserMembershipRequests(userId: string): Promise<any[]> {
    try {
      const requests = await this.db
        .selectFrom("league_membership_requests")
        .innerJoin(
          "leagues",
          "leagues.id",
          "league_membership_requests.league_id",
        )
        .select([
          "league_membership_requests.id",
          "league_membership_requests.league_id",
          "league_membership_requests.requested_role",
          "league_membership_requests.status",
          "league_membership_requests.created_at",
          "leagues.name as league_name",
        ])
        .where("league_membership_requests.user_id", "=", userId)
        .execute();

      return requests;
    } catch (error) {
      throw new DatabaseError(
        "Failed to get user's membership requests",
        error,
      );
    }
  }

  /**
   * Approve a league membership request
   */
  async approveLeagueMembershipRequest(requestId: string): Promise<boolean> {
    try {
      // Get the request details
      const request = await this.db
        .selectFrom("league_membership_requests")
        .selectAll()
        .where("id", "=", requestId)
        .where("status", "=", "pending")
        .executeTakeFirst();

      if (!request) {
        throw new NotFoundError("Request");
      }

      // Update request status
      await this.db
        .updateTable("league_membership_requests")
        .set({ status: "approved" })
        .where("id", "=", requestId)
        .execute();

      // Add or update league member
      await this.addLeagueMember(
        request.league_id,
        request.user_id,
        request.requested_role,
      );

      return true;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        "Failed to approve league membership request",
        error,
      );
    }
  }

  /**
   * Reject a league membership request
   */
  async rejectLeagueMembershipRequest(requestId: string): Promise<boolean> {
    try {
      const result = await this.db
        .updateTable("league_membership_requests")
        .set({ status: "rejected" })
        .where("id", "=", requestId)
        .where("status", "=", "pending")
        .execute();

      return !!result;
    } catch (error) {
      throw new DatabaseError(
        "Failed to reject league membership request",
        error,
      );
    }
  }

  /**
   * Create a new league
   */
  async createLeague(data: {
    name: string;
    location_id: string;
    start_date: string | Date;
    end_date: string | Date;
    description?: string;
    max_teams?: number;
    simulator_settings?: Record<string, unknown>;
    status?: LeagueStatus;
    banner_image_url?: string;
    cost?: number;
    payment_type?: PaymentType;
    day_of_week?: DayOfWeek;
    start_time?: string;
    bays?: string[];
    scheduling_format?: SchedulingFormatType;
    playoff_format?: PlayoffFormatType;
    playoff_size?: number;
    prize_breakdown?: Record<string, unknown>;
    handicap_mode?: HandicapMode;
    is_public?: boolean;
    series_id?: string;
  }): Promise<LeagueBasic> {
    try {
      const {
        name,
        location_id,
        start_date,
        end_date,
        description,
        max_teams = 8,
        simulator_settings = {},
        status = "pending",
        banner_image_url,
        cost,
        payment_type = "upfront",
        day_of_week,
        start_time,
        bays,
        scheduling_format = "round_robin",
        playoff_format = "none",
        playoff_size = 0,
        prize_breakdown = null,
        handicap_mode = "none",
        is_public = true,
        series_id,
      } = data;

      const leagueId = uuidv4();

      const result = await this.db
        .insertInto("leagues")
        .values({
          id: leagueId,
          name,
          location_id,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          description,
          max_teams,
          simulator_settings,
          status: status as LeagueStatus,
          banner_image_url,
          cost,
          payment_type,
          day_of_week,
          start_time,
          bays,
          scheduling_format,
          playoff_format,
          playoff_size,
          prize_breakdown,
          handicap_mode,
          is_public,
          series_id: series_id || undefined,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return result as LeagueBasic;
    } catch (error) {
      throw new DatabaseError("Failed to create league", error);
    }
  }

  /**
   * Update an existing league
   */
  async updateLeague(
    id: string,
    data: {
      name?: string;
      start_date?: string | Date;
      end_date?: string | Date;
      description?: string;
      max_teams?: number;
      simulator_settings?: Record<string, unknown>;
      status?: LeagueStatus;
      banner_image_url?: string;
      cost?: number;
      payment_type?: PaymentType;
      day_of_week?: DayOfWeek;
      start_time?: string;
      bays?: string[];
      scheduling_format?: SchedulingFormatType;
      playoff_format?: PlayoffFormatType;
      playoff_size?: number;
      prize_breakdown?: Record<string, unknown>;
      series_id?: string | null;
    },
  ): Promise<LeagueBasic | null> {
    try {
      // Process date fields if they exist
      const updateData = { ...data };
      if (updateData.start_date) {
        updateData.start_date = new Date(updateData.start_date);
      }
      if (updateData.end_date) {
        updateData.end_date = new Date(updateData.end_date);
      }

      const result = await this.db
        .updateTable("leagues")
        .set(updateData as Updateable<Database["leagues"]>)
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirst();

      return result as LeagueBasic | null;
    } catch (error) {
      throw new DatabaseError("Failed to update league", error);
    }
  }

  /**
   * Delete a league (soft delete by changing status to 'inactive')
   */
  async deleteLeague(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .updateTable("leagues")
        .set({ status: "inactive" })
        .where("id", "=", id)
        .execute();

      return !!result;
    } catch (error) {
      throw new DatabaseError("Failed to delete league", error);
    }
  }

  /**
   * Get league standings (teams sorted by wins)
   */
  async getLeagueStandings(leagueId: string): Promise<any[]> {
    try {
      const standings = await this.db
        .selectFrom("stats")
        .innerJoin("teams", "teams.id", "stats.team_id")
        .select([
          "stats.team_id",
          "teams.name as team_name",
          "stats.matches_played",
          "stats.matches_won as wins",
          "stats.matches_lost as losses",
          "stats.matches_drawn as draws",
        ])
        .where("stats.league_id", "=", leagueId)
        .where("teams.status", "=", "active")
        .execute();

      return standings
        .map((row) => ({
          team_id: row.team_id,
          team_name: row.team_name,
          matches_played: row.matches_played,
          wins: row.wins,
          losses: row.losses,
          draws: row.draws,
          points: row.wins * 3 + row.draws,
        }))
        .sort((a, b) => b.points - a.points);
    } catch (error) {
      throw new DatabaseError("Failed to get league standings", error);
    }
  }

  /**
   * Get all active teams in a league
   */
  async getLeagueTeams(leagueId: string): Promise<TeamInfo[]> {
    try {
      const teams = await this.db
        .selectFrom("teams")
        .select(["id", "name", "max_members"])
        .where("league_id", "=", leagueId)
        .where("status", "=", "active")
        .execute();

      // Get member count for each team
      const teamsWithCount = await Promise.all(
        teams.map(async (team) => {
          const memberCount = await this.db
            .selectFrom("team_members")
            .select(({ fn }) => fn.count<number>("id").as("count"))
            .where("team_id", "=", team.id)
            .where("status", "=", "active")
            .executeTakeFirst();

          return {
            ...team,
            member_count: memberCount?.count || 0,
          };
        }),
      );

      return teamsWithCount as TeamInfo[];
    } catch (error) {
      throw new DatabaseError("Failed to get league teams", error);
    }
  }

  /**
   * Generate schedule for a league based on the scheduling format
   * @param leagueId - ID of the league
   * @param teams - List of teams to schedule
   * @param format - Scheduling format to use
   * @returns Number of matches created
   */
  async generateSchedule(
    leagueId: string,
    teams: TeamInfo[],
    format: SchedulingFormatType,
  ): Promise<number> {
    try {
      // Get league details for scheduling parameters
      const league = await this.db
        .selectFrom("leagues")
        .select(["start_date", "end_date", "day_of_week", "start_time"])
        .where("id", "=", leagueId)
        .executeTakeFirst();

      if (!league) {
        throw new NotFoundError("League");
      }

      // Setup match dates based on league parameters
      const startDate = new Date(league.start_date);
      const endDate = new Date(league.end_date);

      // Default match day and time if not set
      const dayOfWeek = league.day_of_week || "saturday";
      const startTime = league.start_time || "10:00:00";

      // Calculate total weeks available for scheduling
      const totalWeeks = Math.floor(
        (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );

      // Calculate first match date based on day of week
      const firstMatchDate = this.getNextDayOfWeek(startDate, dayOfWeek);

      // Initialize array for match creation queries
      const matches = [];

      // Get match dates for the entire schedule
      const matchDates = this.generateMatchDates(
        firstMatchDate,
        dayOfWeek,
        totalWeeks,
      );

      // Generate matches based on format
      switch (format) {
        case "round_robin":
          matches.push(
            ...this.generateRoundRobinMatches(
              leagueId,
              teams,
              matchDates,
              startTime,
            ),
          );
          break;
        case "groups":
          // Not implemented yet
          throw new ValidationError("Groups format not implemented yet");
        case "swiss":
          // Not implemented yet
          throw new ValidationError("Swiss format not implemented yet");
        case "ladder":
          // Not implemented yet
          throw new ValidationError("Ladder format not implemented yet");
        case "custom":
          // Not implemented yet
          throw new ValidationError("Custom format not implemented yet");
        default:
          matches.push(
            ...this.generateRoundRobinMatches(
              leagueId,
              teams,
              matchDates,
              startTime,
            ),
          );
      }

      // Batch insert all matches
      if (matches.length > 0) {
        await this.db.insertInto("matches").values(matches).execute();
      }

      return matches.length;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError)
        throw error;
      throw new DatabaseError("Failed to generate schedule", error);
    }
  }

  /**
   * Generate match dates for the schedule based on the day of week
   */
  private generateMatchDates(
    startDate: Date,
    dayOfWeek: string,
    totalWeeks: number,
  ): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(startDate);

    for (let i = 0; i < totalWeeks; i++) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return dates;
  }

  /**
   * Get the next date with the specified day of week
   */
  private getNextDayOfWeek(date: Date, dayOfWeek: string): Date {
    const result = new Date(date);
    const days = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0,
    };

    const targetDay = days[dayOfWeek as keyof typeof days];
    const currentDay = result.getDay();

    result.setDate(result.getDate() + ((targetDay + 7 - currentDay) % 7));

    return result;
  }

  /**
   * Generate matches for a round-robin tournament
   */
  private generateRoundRobinMatches(
    leagueId: string,
    teams: TeamInfo[],
    matchDates: Date[],
    startTime: string,
  ): any[] {
    if (teams.length < 2) return [];

    const matches = [];
    const teamIds = teams.map((t) => t.id);

    // If odd number of teams, add a "bye" team (null)
    if (teamIds.length % 2 !== 0) {
      teamIds.push("bye");
    }

    const numberOfRounds = teamIds.length - 1;
    const matchesPerRound = teamIds.length / 2;

    // Clone team IDs array for rotation algorithm
    const rotatingTeams = [...teamIds];
    const firstTeam = rotatingTeams.shift()!;

    for (let round = 0; round < numberOfRounds; round++) {
      const roundMatchDate = matchDates[round % matchDates.length];

      if (!roundMatchDate) continue;

      const matchDateTime = this.combineDateAndTime(roundMatchDate, startTime);

      for (let match = 0; match < matchesPerRound; match++) {
        const homeTeam = match === 0 ? firstTeam : rotatingTeams[match - 1];
        const awayTeam = rotatingTeams[rotatingTeams.length - match];

        // Skip matches with the "bye" team
        if (homeTeam === "bye" || awayTeam === "bye") continue;

        // Add home-and-away matches
        matches.push({
          id: uuidv4(),
          league_id: leagueId,
          home_team_id: homeTeam,
          away_team_id: awayTeam,
          match_date: new Date(matchDateTime),
          status: "scheduled",
          created_at: undefined,
          updated_at: undefined,
        });
      }

      // Rotate teams for the next round (first team stays fixed)
      rotatingTeams.push(rotatingTeams.shift()!);
    }

    // Add return matches (home and away)
    const returnMatches = matches.map((match) => ({
      id: uuidv4(),
      league_id: match.league_id,
      home_team_id: match.away_team_id,
      away_team_id: match.home_team_id,
      match_date: this.addWeeks(match.match_date, numberOfRounds),
      status: "scheduled",
      created_at: undefined,
      updated_at: undefined,
    }));

    return [...matches, ...returnMatches];
  }

  /**
   * Combine a date and time string into a single Date object
   */
  private combineDateAndTime(date: Date, timeString: string): Date {
    const result = new Date(date);
    const [hours, minutes, seconds] = timeString.split(":").map(Number);

    result.setHours(hours || 0, minutes || 0, seconds || 0);

    return result;
  }

  /**
   * Add a number of weeks to a date
   */
  private addWeeks(date: Date, weeks: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + weeks * 7);
    return result;
  }

  /**
   * Generate a playoff bracket from current standings
   */
  async generatePlayoffBracket(
    leagueId: string,
  ): Promise<{ matches_created: number }> {
    const league = await this.db
      .selectFrom("leagues")
      .select([
        "playoff_format",
        "playoff_size",
        "end_date",
        "day_of_week",
        "start_time",
      ])
      .where("id", "=", leagueId)
      .executeTakeFirst();

    if (!league) {
      throw new NotFoundError("League");
    }

    if (
      league.playoff_format === "none" ||
      !league.playoff_size ||
      league.playoff_size < 2
    ) {
      throw new ValidationError("League does not have playoffs configured");
    }

    // Check no existing playoff matches
    const existingPlayoffs = await this.db
      .selectFrom("matches")
      .select("id")
      .where("league_id", "=", leagueId)
      .where("is_playoff", "=", true)
      .executeTakeFirst();

    if (existingPlayoffs) {
      throw new ConflictError("Playoff bracket already exists for this league");
    }

    // Get standings to seed the bracket
    const standings = await this.getLeagueStandings(leagueId);

    if (standings.length < league.playoff_size) {
      throw new ValidationError(
        `Not enough teams with stats (${standings.length}) for playoff size (${league.playoff_size})`,
      );
    }

    const playoffTeams = standings.slice(0, league.playoff_size);
    const startTime = league.start_time || "10:00:00";
    const dayOfWeek = league.day_of_week || "saturday";

    // Start playoff matches after the league end date
    const firstPlayoffDate = this.getNextDayOfWeek(
      new Date(league.end_date),
      dayOfWeek,
    );

    // Generate single elimination round 1 matches
    const matches = this.generateSingleEliminationRound(
      leagueId,
      playoffTeams,
      firstPlayoffDate,
      startTime,
      1,
    );

    if (matches.length > 0) {
      await this.db.insertInto("matches").values(matches).execute();
    }

    return { matches_created: matches.length };
  }

  /**
   * Generate matches for a single-elimination round
   * Seed 1 vs Seed N, Seed 2 vs Seed N-1, etc.
   */
  private generateSingleEliminationRound(
    leagueId: string,
    teams: Array<{ team_id: string }>,
    matchDate: Date,
    startTime: string,
    round: number,
  ): any[] {
    const matches = [];
    const matchDateTime = this.combineDateAndTime(matchDate, startTime);

    for (let i = 0; i < teams.length / 2; i++) {
      const homeSeed = i + 1;
      const awaySeed = teams.length - i;
      const homeTeam = teams[i];
      const awayTeam = teams[teams.length - 1 - i];

      matches.push({
        id: uuidv4(),
        league_id: leagueId,
        home_team_id: homeTeam.team_id,
        away_team_id: awayTeam.team_id,
        match_date: new Date(matchDateTime),
        status: "scheduled",
        is_playoff: true,
        playoff_round: round,
        playoff_seed_home: homeSeed,
        playoff_seed_away: awaySeed,
      });
    }

    return matches;
  }

  /**
   * Get the playoff bracket for a league
   */
  async getPlayoffBracket(leagueId: string): Promise<{
    format: PlayoffFormatType;
    playoff_size: number;
    rounds: Array<{
      round_number: number;
      matches: any[];
    }>;
  }> {
    const league = await this.db
      .selectFrom("leagues")
      .select(["playoff_format", "playoff_size"])
      .where("id", "=", leagueId)
      .executeTakeFirst();

    if (!league) {
      throw new NotFoundError("League");
    }

    const playoffMatches = await this.db
      .selectFrom("matches")
      .leftJoin("teams as home_team", "home_team.id", "matches.home_team_id")
      .leftJoin("teams as away_team", "away_team.id", "matches.away_team_id")
      .select([
        "matches.id",
        "matches.home_team_id",
        "matches.away_team_id",
        "matches.match_date",
        "matches.status",
        "matches.home_team_score",
        "matches.away_team_score",
        "matches.playoff_round",
        "matches.playoff_seed_home",
        "matches.playoff_seed_away",
        "matches.next_match_id",
        "home_team.name as home_team_name",
        "away_team.name as away_team_name",
      ])
      .where("matches.league_id", "=", leagueId)
      .where("matches.is_playoff", "=", true)
      .orderBy("matches.playoff_round")
      .orderBy("matches.playoff_seed_home")
      .execute();

    // Group by round
    const roundsMap = new Map<number, any[]>();
    for (const match of playoffMatches) {
      const round = match.playoff_round ?? 1;
      if (!roundsMap.has(round)) {
        roundsMap.set(round, []);
      }
      roundsMap.get(round)!.push(match);
    }

    const rounds = Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([round_number, matches]) => ({ round_number, matches }));

    return {
      format: league.playoff_format as PlayoffFormatType,
      playoff_size: league.playoff_size,
      rounds,
    };
  }

  /**
   * Advance winners when all matches in a playoff round are complete.
   * Creates the next round matches.
   */
  async advancePlayoffWinner(matchId: string): Promise<void> {
    const match = await this.db
      .selectFrom("matches")
      .select([
        "id",
        "league_id",
        "home_team_id",
        "away_team_id",
        "home_team_score",
        "away_team_score",
        "status",
        "is_playoff",
        "playoff_round",
        "playoff_seed_home",
        "playoff_seed_away",
      ])
      .where("id", "=", matchId)
      .executeTakeFirst();

    if (!match || !match.is_playoff || match.status !== "completed") {
      return;
    }

    const round = match.playoff_round ?? 1;

    // Get all matches in this round
    const roundMatches = await this.db
      .selectFrom("matches")
      .select([
        "id",
        "status",
        "home_team_score",
        "away_team_score",
        "home_team_id",
        "away_team_id",
        "playoff_seed_home",
        "playoff_seed_away",
      ])
      .where("league_id", "=", match.league_id)
      .where("is_playoff", "=", true)
      .where("playoff_round", "=", round)
      .orderBy("playoff_seed_home")
      .execute();

    // If only 1 match in this round, it's the final
    if (roundMatches.length <= 1) {
      return;
    }

    // Check if all matches in this round are complete
    const allComplete = roundMatches.every((m) => m.status === "completed");
    if (!allComplete) {
      return;
    }

    // Check if next round already exists
    const nextRoundExists = await this.db
      .selectFrom("matches")
      .select("id")
      .where("league_id", "=", match.league_id)
      .where("is_playoff", "=", true)
      .where("playoff_round", "=", round + 1)
      .executeTakeFirst();

    if (nextRoundExists) {
      return;
    }

    // Collect all winners
    const winners = roundMatches.map((m) => {
      const isHomeWinner = m.home_team_score > m.away_team_score;
      return {
        team_id: isHomeWinner ? m.home_team_id : m.away_team_id,
        seed: isHomeWinner ? m.playoff_seed_home : m.playoff_seed_away,
      };
    });

    // Get league scheduling info
    const league = await this.db
      .selectFrom("leagues")
      .select(["day_of_week", "start_time"])
      .where("id", "=", match.league_id)
      .executeTakeFirst();

    const startTime = league?.start_time || "10:00:00";
    const dayOfWeek = league?.day_of_week || "saturday";

    // Next round date is 1 week after current round
    const currentRoundDate = await this.db
      .selectFrom("matches")
      .select("match_date")
      .where("league_id", "=", match.league_id)
      .where("is_playoff", "=", true)
      .where("playoff_round", "=", round)
      .orderBy("match_date", "desc")
      .executeTakeFirst();

    const nextRoundDate = currentRoundDate
      ? this.getNextDayOfWeek(
          this.addWeeks(new Date(currentRoundDate.match_date), 1),
          dayOfWeek,
        )
      : new Date();

    // Create next round matches
    const nextRoundMatches = this.generateSingleEliminationRound(
      match.league_id,
      winners as Array<{ team_id: string }>,
      nextRoundDate,
      startTime,
      round + 1,
    );

    if (nextRoundMatches.length > 0) {
      await this.db.insertInto("matches").values(nextRoundMatches).execute();
    }
  }
}
