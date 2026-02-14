import { db } from "../../../src/db";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { generateKeyPairSync } from "crypto";
import {
  UserRole,
  TeamMemberRole,
  TeamStatus,
  LeagueStatus,
  MatchStatus,
  NotificationType,
  MatchResultStatus,
  CommunicationType,
  LeagueMemberRole,
  HandednessType,
  SchedulingFormatType,
  PlayoffFormatType,
} from "../../../src/types/database";
import {
  SeedData,
  SeedUser,
  SeedOwner,
  SeedLocation,
  SeedLeague,
  SeedTeam,
  SeedTeamMember,
  SeedMatch,
  SeedNotification,
  SeedMatchResultSubmission,
  SeedCommunication,
  SeedBay,
  SeedSeries,
} from "./types";

// Use the SeedData interface directly
type SeedResult = SeedData;

export async function seed(): Promise<SeedData> {
  console.log("Seeding database for E2E tests...");

  // Store all created entities
  const result: SeedData = {
    users: [],
    owners: [],
    locations: [],
    leagues: [],
    teams: [],
    teamMembers: [],
    matches: [],
    notifications: [],
    matchResultSubmissions: [],
    communications: [],
    bays: [],
    series: [],
  };

  try {
    // Create admin user
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash("admin123", 10);
    await db
      .insertInto("users")
      .values({
        id: adminId,
        username: "admin",
        email: "admin@example.com",
        password_hash: adminPasswordHash,
        role: "admin" as UserRole,
      })
      .execute();

    // Create account row for better-auth credential provider
    await db
      .insertInto("account")
      .values({
        id: uuidv4(),
        user_id: adminId,
        account_id: adminId,
        provider_id: "credential",
        password: adminPasswordHash,
      })
      .execute();

    result.users.push({
      id: adminId,
      username: "admin",
      email: "admin@example.com",
      role: "admin",
    });

    // Create regular users
    const user1Id = uuidv4();
    const user1PasswordHash = await bcrypt.hash("password123", 10);
    await db
      .insertInto("users")
      .values({
        id: user1Id,
        username: "user1",
        email: "user1@example.com",
        password_hash: user1PasswordHash,
        role: "user" as UserRole,
      })
      .execute();

    await db
      .insertInto("account")
      .values({
        id: uuidv4(),
        user_id: user1Id,
        account_id: user1Id,
        provider_id: "credential",
        password: user1PasswordHash,
      })
      .execute();

    result.users.push({
      id: user1Id,
      username: "user1",
      email: "user1@example.com",
      role: "user",
    });

    const user2Id = uuidv4();
    const user2PasswordHash = await bcrypt.hash("password123", 10);
    await db
      .insertInto("users")
      .values({
        id: user2Id,
        username: "user2",
        email: "user2@example.com",
        password_hash: user2PasswordHash,
        role: "user" as UserRole,
      })
      .execute();

    await db
      .insertInto("account")
      .values({
        id: uuidv4(),
        user_id: user2Id,
        account_id: user2Id,
        provider_id: "credential",
        password: user2PasswordHash,
      })
      .execute();

    result.users.push({
      id: user2Id,
      username: "user2",
      email: "user2@example.com",
      role: "user",
    });

    // Create an owner (using admin user)
    const ownerId = uuidv4();
    await db
      .insertInto("owners")
      .values({
        id: ownerId,
        user_id: adminId,
        name: "Test Owner",
      })
      .execute();

    result.owners.push({
      id: ownerId,
      user_id: adminId,
      name: "Test Owner",
    });

    // Create a location
    const locationId = uuidv4();
    await db
      .insertInto("locations")
      .values({
        id: locationId,
        owner_id: ownerId,
        name: "Test Golf Club",
        address: "123 Fairway Drive",
        logo_url: "https://example.com/test-golf-club-logo.png",
        banner_url: "https://example.com/test-golf-club-banner.jpg",
        website_url: "https://testgolfclub.example.com",
        phone: "+1 (555) 123-4567",
        coordinates: "(40.7128,-74.0060)", // New York coordinates as example
      })
      .execute();

    result.locations.push({
      id: locationId,
      owner_id: ownerId,
      name: "Test Golf Club",
      address: "123 Fairway Drive",
      logo_url: "https://example.com/test-golf-club-logo.png",
      banner_url: "https://example.com/test-golf-club-banner.jpg",
      website_url: "https://testgolfclub.example.com",
      phone: "+1 (555) 123-4567",
      coordinates: { x: 40.7128, y: -74.006 }, // New York coordinates as example
    });

    // After creating the location, add bays
    const bay1Id = uuidv4();
    await db
      .insertInto("bays")
      .values({
        id: bay1Id,
        location_id: locationId,
        bay_number: "Bay-1",
        max_people: 4,
        handedness: "both" as HandednessType,
        details: {
          simulator_model: "TrackMan 4",
          premium_features: ["club_analysis", "ball_tracking"],
          has_refreshments: true,
        },
      })
      .execute();

    result.bays.push({
      id: bay1Id,
      location_id: locationId,
      bay_number: "Bay-1",
      max_people: 4,
      handedness: "both",
      details: {
        simulator_model: "TrackMan 4",
        premium_features: ["club_analysis", "ball_tracking"],
        has_refreshments: true,
      },
    });

    const bay2Id = uuidv4();
    await db
      .insertInto("bays")
      .values({
        id: bay2Id,
        location_id: locationId,
        bay_number: "Bay-2",
        max_people: 6,
        handedness: "right" as HandednessType,
        details: {
          simulator_model: "GC Quad",
          premium_features: ["putting_analysis", "virtual_courses"],
          room_size: "large",
        },
      })
      .execute();

    result.bays.push({
      id: bay2Id,
      location_id: locationId,
      bay_number: "Bay-2",
      max_people: 6,
      handedness: "right",
      details: {
        simulator_model: "GC Quad",
        premium_features: ["putting_analysis", "virtual_courses"],
        room_size: "large",
      },
    });

    const bay3Id = uuidv4();
    await db
      .insertInto("bays")
      .values({
        id: bay3Id,
        location_id: locationId,
        bay_number: "Bay-3",
        max_people: 4,
        handedness: "left" as HandednessType,
        details: {
          simulator_model: "Foresight Sports",
          left_handed_clubs: true,
        },
      })
      .execute();

    result.bays.push({
      id: bay3Id,
      location_id: locationId,
      bay_number: "Bay-3",
      max_people: 4,
      handedness: "left",
      details: {
        simulator_model: "Foresight Sports",
        left_handed_clubs: true,
      },
    });

    // Create a league
    const leagueId = uuidv4();
    await db
      .insertInto("leagues")
      .values({
        id: leagueId,
        location_id: locationId,
        name: "Spring 2024 League",
        start_date: new Date("2024-03-01"),
        end_date: new Date("2024-06-30"),
        max_teams: 8,
        status: "active" as LeagueStatus,
        scheduling_format: "round_robin" as SchedulingFormatType,
        playoff_format: "none" as PlayoffFormatType,
        playoff_size: 0,
        handicap_mode: "none",
      })
      .execute();

    result.leagues.push({
      id: leagueId,
      location_id: locationId,
      name: "Spring 2024 League",
      start_date: new Date("2024-03-01"),
      end_date: new Date("2024-06-30"),
      max_teams: 8,
      status: "active",
      scheduling_format: "round_robin",
      playoff_format: "none",
      playoff_size: 0,
    });

    // Create a series
    const seriesId = uuidv4();
    await db
      .insertInto("series")
      .values({
        id: seriesId,
        location_id: locationId,
        name: "Spring 2024 Series",
        description: "The first series of 2024",
        start_date: new Date("2024-01-01"),
        end_date: new Date("2024-06-30"),
        is_active: true,
      })
      .execute();

    result.series.push({
      id: seriesId,
      location_id: locationId,
      name: "Spring 2024 Series",
      description: "The first series of 2024",
      start_date: new Date("2024-01-01"),
      end_date: new Date("2024-06-30"),
      is_active: true,
    });

    // Create teams
    const team1Id = uuidv4();
    await db
      .insertInto("teams")
      .values({
        id: team1Id,
        league_id: leagueId,
        name: "Eagles",
        max_members: 4,
        status: "active" as TeamStatus,
      })
      .execute();

    result.teams.push({
      id: team1Id,
      league_id: leagueId,
      name: "Eagles",
      max_members: 4,
      status: "active",
    });

    const team2Id = uuidv4();
    await db
      .insertInto("teams")
      .values({
        id: team2Id,
        league_id: leagueId,
        name: "Birdies",
        max_members: 4,
        status: "active" as TeamStatus,
      })
      .execute();

    result.teams.push({
      id: team2Id,
      league_id: leagueId,
      name: "Birdies",
      max_members: 4,
      status: "active",
    });

    // Create team members
    const member1Id = uuidv4();
    await db
      .insertInto("team_members")
      .values({
        id: member1Id,
        team_id: team1Id,
        user_id: user1Id,
        role: "member" as TeamMemberRole,
        status: "active" as TeamStatus,
      })
      .execute();

    result.teamMembers.push({
      id: member1Id,
      team_id: team1Id,
      user_id: user1Id,
      role: "member",
      status: "active",
    });

    const member2Id = uuidv4();
    await db
      .insertInto("team_members")
      .values({
        id: member2Id,
        team_id: team2Id,
        user_id: user2Id,
        role: "member" as TeamMemberRole,
        status: "active" as TeamStatus,
      })
      .execute();

    result.teamMembers.push({
      id: member2Id,
      team_id: team2Id,
      user_id: user2Id,
      role: "member",
      status: "active",
    });

    // Create a match
    const match1Id = uuidv4();
    // Create player details object with the same info that would have been in match_games
    const playerDetails = {
      [member1Id]: {
        game_number: 1,
        score: null,
        opponent_score: null,
        opponent_id: member2Id,
        status: "pending",
      },
      [member2Id]: {
        game_number: 1,
        score: null,
        opponent_score: null,
        opponent_id: member1Id,
        status: "pending",
      },
    };

    await db
      .insertInto("matches")
      .values({
        id: match1Id,
        league_id: leagueId,
        home_team_id: team1Id,
        away_team_id: team2Id,
        match_date: new Date("2024-04-15T14:00:00Z"),
        status: "scheduled" as MatchStatus,
        home_team_score: 0,
        away_team_score: 0,
        player_details: playerDetails,
      })
      .execute();

    result.matches.push({
      id: match1Id,
      league_id: leagueId,
      home_team_id: team1Id,
      away_team_id: team2Id,
      match_date: new Date("2024-04-15T14:00:00Z"),
      status: "scheduled",
      home_team_score: 0,
      away_team_score: 0,
      player_details: playerDetails,
    });

    // Ensure JWKS keys exist for better-auth JWT signing
    const existingKeys = await db
      .selectFrom('jwks')
      .selectAll()
      .executeTakeFirst();

    if (!existingKeys) {
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      const publicJwk = publicKey.export({ format: "jwk" });
      const privateJwk = privateKey.export({ format: "jwk" });
      (publicJwk as any).alg = "EdDSA";
      (privateJwk as any).alg = "EdDSA";

      // Set expiration to 30 days from now (matching better-auth rotation interval)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await db
        .insertInto("jwks")
        .values({
          id: uuidv4(),
          public_key: JSON.stringify(publicJwk),
          private_key: JSON.stringify(privateJwk),
          expires_at: expiresAt,
        })
        .execute();
    }

    // Create notifications
    // 1. Team invite notification for user1
    const notification1Id = uuidv4();
    await db
      .insertInto("notifications")
      .values({
        id: notification1Id,
        user_id: user1Id,
        title: "Team Invitation",
        body: "You have been invited to join the Birdies team",
        type: "team_invite" as NotificationType,
        action_id: team2Id,
        is_read: false,
      })
      .execute();

    result.notifications.push({
      id: notification1Id,
      user_id: user1Id,
      title: "Team Invitation",
      body: "You have been invited to join the Birdies team",
      type: "team_invite",
      action_id: team2Id,
      is_read: false,
    });

    // 2. Match reminder notification for user1
    const notification2Id = uuidv4();
    await db
      .insertInto("notifications")
      .values({
        id: notification2Id,
        user_id: user1Id,
        title: "Upcoming Match Reminder",
        body: "Your match against Birdies is scheduled for tomorrow",
        type: "match_reminder" as NotificationType,
        action_id: match1Id,
        is_read: true,
      })
      .execute();

    result.notifications.push({
      id: notification2Id,
      user_id: user1Id,
      title: "Upcoming Match Reminder",
      body: "Your match against Birdies is scheduled for tomorrow",
      type: "match_reminder",
      action_id: match1Id,
      is_read: true,
    });

    // 3. System notification for user2
    const notification3Id = uuidv4();
    await db
      .insertInto("notifications")
      .values({
        id: notification3Id,
        user_id: user2Id,
        title: "Welcome to the League",
        body: "Welcome to the Spring 2024 League! Good luck with your games.",
        type: "system_message" as NotificationType,
        is_read: false,
      })
      .execute();

    result.notifications.push({
      id: notification3Id,
      user_id: user2Id,
      title: "Welcome to the League",
      body: "Welcome to the Spring 2024 League! Good luck with your games.",
      type: "system_message",
      is_read: false,
    });

    // Create another match for testing match result submissions
    const match2Id = uuidv4();
    await db
      .insertInto("matches")
      .values({
        id: match2Id,
        league_id: leagueId,
        home_team_id: team1Id,
        away_team_id: team2Id,
        match_date: new Date("2024-04-20T14:00:00Z"), // A future date
        status: "scheduled" as MatchStatus,
        home_team_score: 0,
        away_team_score: 0,
        player_details: playerDetails, // Use the same player details
      })
      .execute();

    result.matches.push({
      id: match2Id,
      league_id: leagueId,
      home_team_id: team1Id,
      away_team_id: team2Id,
      match_date: new Date("2024-04-20T14:00:00Z"),
      status: "scheduled",
      home_team_score: 0,
      away_team_score: 0,
      player_details: playerDetails,
    });

    // Create match result submissions
    // 1. Create a submission from team1 (for match2)
    const submission1Id = uuidv4();
    await db
      .insertInto("match_result_submissions")
      .values({
        id: submission1Id,
        match_id: match2Id,
        team_id: team1Id,
        user_id: user1Id,
        home_team_score: 5,
        away_team_score: 3,
        notes: "Good match!",
        status: "pending" as MatchResultStatus,
      })
      .execute();

    result.matchResultSubmissions.push({
      id: submission1Id,
      match_id: match2Id,
      team_id: team1Id,
      user_id: user1Id,
      home_team_score: 5,
      away_team_score: 3,
      notes: "Good match!",
      status: "pending",
    });

    // Create match with conflicting submissions for testing
    const match3Id = uuidv4();
    await db
      .insertInto("matches")
      .values({
        id: match3Id,
        league_id: leagueId,
        home_team_id: team1Id,
        away_team_id: team2Id,
        match_date: new Date("2024-04-10T10:00:00Z"), // Past date
        status: "in_progress" as MatchStatus,
        home_team_score: 0,
        away_team_score: 0,
        player_details: playerDetails, // Use the same player details
      })
      .execute();

    result.matches.push({
      id: match3Id,
      league_id: leagueId,
      home_team_id: team1Id,
      away_team_id: team2Id,
      match_date: new Date("2024-04-10T10:00:00Z"),
      status: "in_progress",
      home_team_score: 0,
      away_team_score: 0,
      player_details: playerDetails,
    });

    // Both teams have submitted conflicting results for match3
    const submission2Id = uuidv4();
    await db
      .insertInto("match_result_submissions")
      .values({
        id: submission2Id,
        match_id: match3Id,
        team_id: team1Id,
        user_id: user1Id,
        home_team_score: 6,
        away_team_score: 2,
        notes: "We won!",
        status: "pending" as MatchResultStatus,
      })
      .execute();

    result.matchResultSubmissions.push({
      id: submission2Id,
      match_id: match3Id,
      team_id: team1Id,
      user_id: user1Id,
      home_team_score: 6,
      away_team_score: 2,
      notes: "We won!",
      status: "pending",
    });

    const submission3Id = uuidv4();
    await db
      .insertInto("match_result_submissions")
      .values({
        id: submission3Id,
        match_id: match3Id,
        team_id: team2Id,
        user_id: user2Id,
        home_team_score: 4,
        away_team_score: 4,
        notes: "It was a draw",
        status: "pending" as MatchResultStatus,
      })
      .execute();

    result.matchResultSubmissions.push({
      id: submission3Id,
      match_id: match3Id,
      team_id: team2Id,
      user_id: user2Id,
      home_team_score: 4,
      away_team_score: 4,
      notes: "It was a draw",
      status: "pending",
    });

    // Create a fourth match specifically for league manager direct updates
    const match4Id = uuidv4();
    await db
      .insertInto("matches")
      .values({
        id: match4Id,
        league_id: leagueId,
        home_team_id: team1Id,
        away_team_id: team2Id,
        match_date: new Date("2024-05-01T14:00:00Z"), // Future date
        status: "scheduled" as MatchStatus,
        home_team_score: 0,
        away_team_score: 0,
        player_details: playerDetails,
      })
      .execute();

    result.matches.push({
      id: match4Id,
      league_id: leagueId,
      home_team_id: team1Id,
      away_team_id: team2Id,
      match_date: new Date("2024-05-01T14:00:00Z"),
      status: "scheduled",
      home_team_score: 0,
      away_team_score: 0,
      player_details: playerDetails,
    });

    // Create communications
    // League welcome announcement
    const now = new Date();
    const leagueCommId = uuidv4();
    await db
      .insertInto("communications")
      .values({
        id: leagueCommId,
        sender_id: adminId,
        recipient_type: "league",
        recipient_id: leagueId,
        type: "league" as CommunicationType,
        title: "Welcome to the Spring 2024 League",
        message:
          "Welcome everyone to our new season! We look forward to a great season.",
        sent_at: now,
      })
      .execute();

    result.communications.push({
      id: leagueCommId,
      sender_id: adminId,
      recipient_type: "league",
      recipient_id: leagueId,
      type: "league",
      title: "Welcome to the Spring 2024 League",
      message:
        "Welcome everyone to our new season! We look forward to a great season.",
      sent_at: now,
    });

    // Maintenance announcement
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const maintenanceCommId = uuidv4();
    await db
      .insertInto("communications")
      .values({
        id: maintenanceCommId,
        sender_id: adminId,
        recipient_type: "league",
        recipient_id: leagueId,
        type: "maintenance" as CommunicationType,
        title: "Scheduled Maintenance",
        message: "The club will be closed for maintenance on Saturday.",
        expiration_date: tomorrow,
        sent_at: now,
      })
      .execute();

    result.communications.push({
      id: maintenanceCommId,
      sender_id: adminId,
      recipient_type: "league",
      recipient_id: leagueId,
      type: "maintenance",
      title: "Scheduled Maintenance",
      message: "The club will be closed for maintenance on Saturday.",
      expiration_date: tomorrow,
      sent_at: now,
    });

    // Anonymous system announcement
    const systemCommId = uuidv4();
    await db
      .insertInto("communications")
      .values({
        id: systemCommId,
        recipient_type: "league",
        recipient_id: leagueId,
        type: "system" as CommunicationType,
        title: "System Update",
        message:
          "The system will undergo an update tonight. Please expect brief downtime.",
        sent_at: now,
      })
      .execute();

    result.communications.push({
      id: systemCommId,
      recipient_type: "league",
      recipient_id: leagueId,
      type: "system",
      title: "System Update",
      message:
        "The system will undergo an update tonight. Please expect brief downtime.",
      sent_at: now,
    });

    // Add users as league members (required for notification tests)
    // Add user1 as a league player
    await db
      .insertInto("league_members")
      .values({
        id: uuidv4(),
        league_id: leagueId,
        user_id: user1Id,
        role: "player" as LeagueMemberRole,
      })
      .execute();

    // Add user2 as a league spectator
    await db
      .insertInto("league_members")
      .values({
        id: uuidv4(),
        league_id: leagueId,
        user_id: user2Id,
        role: "spectator" as LeagueMemberRole,
      })
      .execute();

    // Add admin as a league manager
    await db
      .insertInto("league_members")
      .values({
        id: uuidv4(),
        league_id: leagueId,
        user_id: adminId,
        role: "manager" as LeagueMemberRole,
      })
      .execute();

    console.log("Database seeding completed successfully");
    return result;
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}
