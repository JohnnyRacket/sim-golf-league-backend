import { db } from '../../../src/db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { 
  UserRole, 
  TeamMemberRole, 
  TeamStatus, 
  LeagueStatus, 
  MatchStatus, 
  MatchGameStatus 
} from '../../../src/types/database';
import { SeedData, SeedUser, SeedManager, SeedLocation, SeedLeague, SeedTeam, SeedTeamMember, SeedMatch, SeedMatchGame } from './types';

// Use the SeedData interface directly
type SeedResult = SeedData;

export async function seed(): Promise<SeedData> {
  console.log('Seeding database for E2E tests...');
  
  // Store all created entities
  const result: SeedData = {
    users: [],
    managers: [],
    locations: [],
    leagues: [],
    teams: [],
    teamMembers: [],
    matches: [],
    matchGames: [],
    tokens: {
      admin: '',
      user: ''
    }
  };

  try {
    // Create admin user
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await db.insertInto('users')
      .values({
        id: adminId,
        username: 'admin',
        email: 'admin@example.com',
        password_hash: adminPasswordHash,
        role: 'admin' as UserRole
      })
      .execute();
    
    result.users.push({
      id: adminId,
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin'
    });
    
    // Create regular users
    const user1Id = uuidv4();
    const user1PasswordHash = await bcrypt.hash('password123', 10);
    await db.insertInto('users')
      .values({
        id: user1Id,
        username: 'user1',
        email: 'user1@example.com',
        password_hash: user1PasswordHash,
        role: 'user' as UserRole
      })
      .execute();
    
    result.users.push({
      id: user1Id,
      username: 'user1',
      email: 'user1@example.com',
      role: 'user'
    });
    
    const user2Id = uuidv4();
    const user2PasswordHash = await bcrypt.hash('password123', 10);
    await db.insertInto('users')
      .values({
        id: user2Id,
        username: 'user2',
        email: 'user2@example.com',
        password_hash: user2PasswordHash,
        role: 'user' as UserRole
      })
      .execute();
    
    result.users.push({
      id: user2Id,
      username: 'user2',
      email: 'user2@example.com',
      role: 'user'
    });
    
    // Create a manager (using admin user)
    const managerId = uuidv4();
    await db.insertInto('managers')
      .values({
        id: managerId,
        user_id: adminId,
        name: 'Test Manager'
      })
      .execute();
    
    result.managers.push({
      id: managerId,
      user_id: adminId,
      name: 'Test Manager'
    });
    
    // Create a location
    const locationId = uuidv4();
    await db.insertInto('locations')
      .values({
        id: locationId,
        manager_id: managerId,
        name: 'Test Golf Club',
        address: '123 Fairway Drive'
      })
      .execute();
    
    result.locations.push({
      id: locationId,
      manager_id: managerId,
      name: 'Test Golf Club',
      address: '123 Fairway Drive'
    });
    
    // Create a league
    const leagueId = uuidv4();
    await db.insertInto('leagues')
      .values({
        id: leagueId,
        location_id: locationId,
        name: 'Spring 2024 League',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2024-06-30'),
        max_teams: 8,
        status: 'active' as LeagueStatus
      })
      .execute();
    
    result.leagues.push({
      id: leagueId,
      location_id: locationId,
      name: 'Spring 2024 League',
      start_date: new Date('2024-03-01'),
      end_date: new Date('2024-06-30'),
      max_teams: 8,
      status: 'active'
    });
    
    // Create teams
    const team1Id = uuidv4();
    await db.insertInto('teams')
      .values({
        id: team1Id,
        league_id: leagueId,
        name: 'Eagles',
        max_members: 4,
        status: 'active' as TeamStatus
      })
      .execute();
    
    result.teams.push({
      id: team1Id,
      league_id: leagueId,
      name: 'Eagles',
      max_members: 4,
      status: 'active'
    });
    
    const team2Id = uuidv4();
    await db.insertInto('teams')
      .values({
        id: team2Id,
        league_id: leagueId,
        name: 'Birdies',
        max_members: 4,
        status: 'active' as TeamStatus
      })
      .execute();
    
    result.teams.push({
      id: team2Id,
      league_id: leagueId,
      name: 'Birdies',
      max_members: 4,
      status: 'active'
    });
    
    // Create team members
    const member1Id = uuidv4();
    await db.insertInto('team_members')
      .values({
        id: member1Id,
        team_id: team1Id,
        user_id: user1Id,
        role: 'member' as TeamMemberRole,
        status: 'active' as TeamStatus
      })
      .execute();
    
    result.teamMembers.push({
      id: member1Id,
      team_id: team1Id,
      user_id: user1Id,
      role: 'member',
      status: 'active'
    });
    
    const member2Id = uuidv4();
    await db.insertInto('team_members')
      .values({
        id: member2Id,
        team_id: team2Id,
        user_id: user2Id,
        role: 'member' as TeamMemberRole,
        status: 'active' as TeamStatus
      })
      .execute();
    
    result.teamMembers.push({
      id: member2Id,
      team_id: team2Id,
      user_id: user2Id,
      role: 'member',
      status: 'active'
    });
    
    // Create a match
    const match1Id = uuidv4();
    await db.insertInto('matches')
      .values({
        id: match1Id,
        league_id: leagueId,
        home_team_id: team1Id,
        away_team_id: team2Id,
        match_date: new Date('2024-04-15T14:00:00Z'),
        status: 'scheduled' as MatchStatus
      })
      .execute();
    
    result.matches.push({
      id: match1Id,
      league_id: leagueId,
      home_team_id: team1Id,
      away_team_id: team2Id,
      match_date: new Date('2024-04-15T14:00:00Z'),
      status: 'scheduled'
    });
    
    // Create match games
    const game1Id = uuidv4();
    await db.insertInto('match_games')
      .values({
        id: game1Id,
        match_id: match1Id,
        game_number: 1,
        home_player_id: user1Id,
        away_player_id: user2Id,
        home_score: null,
        away_score: null,
        status: 'pending' as MatchGameStatus
      })
      .execute();
    
    result.matchGames.push({
      id: game1Id,
      match_id: match1Id,
      game_number: 1,
      home_player_id: user1Id,
      away_player_id: user2Id,
      home_score: null,
      away_score: null,
      status: 'pending'
    });
    
    // Create tokens (these would be actual JWT tokens in a real implementation)
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production';
    
    // Generate real JWT tokens
    result.tokens = {
      admin: jwt.sign({ 
        id: adminId, 
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin', 'manager']
      }, secret, { expiresIn: '1h' }),
      
      user: jwt.sign({ 
        id: user1Id, 
        username: 'user1',
        email: 'user1@example.com',
        roles: ['user']
      }, secret, { expiresIn: '1h' })
    };
    
    console.log('Database seeding completed successfully');
    return result;
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
} 