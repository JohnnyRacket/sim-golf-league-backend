import { FastifyInstance } from 'fastify';
import fastify from 'fastify';

/**
 * Creates a Fastify server instance for testing
 */
export async function createTestServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false
  });

  // Register routes that our tests will use
  app.get('/match-history/league/:league_id', async (request, reply) => {
    const { league_id } = request.params as { league_id: string };
    const { team_id } = request.query as { team_id?: string };
    
    // Create base matches
    const matches = [
      {
        id: '1',
        league_id,
        home_team_id: team_id || '1',
        away_team_id: '2',
        match_date: new Date().toISOString(),
        status: 'completed',
        home_team: { name: 'Home Team' },
        away_team: { name: 'Away Team' }
      },
      {
        id: '2',
        league_id,
        home_team_id: '2',
        away_team_id: team_id || '1',
        match_date: new Date().toISOString(),
        status: 'completed',
        home_team: { name: 'Away Team' },
        away_team: { name: 'Home Team' }
      }
    ];
    
    return matches;
  });

  app.get('/match-history/league/:league_id/date-range', async (request, reply) => {
    const { league_id } = request.params as { league_id: string };
    const { start_date, end_date } = request.query as { start_date: string, end_date: string };
    
    // Return mock data based on date range
    return [
      {
        id: '1',
        league_id,
        home_team_id: '1',
        away_team_id: '2',
        match_date: '2024-01-15T12:00:00.000Z',
        status: 'completed',
        home_team: { name: 'Home Team' },
        away_team: { name: 'Away Team' }
      }
    ];
  });

  app.get('/match-history/user/:user_id/summary', async (request, reply) => {
    const { user_id } = request.params as { user_id: string };
    
    return [
      {
        league_id: '1',
        league_name: 'Test League',
        matches_played: 2,
        games_won: 1,
        average_score: 75.5
      }
    ];
  });

  app.get('/match-history/match/:match_id', async (request, reply) => {
    const { match_id } = request.params as { match_id: string };
    
    return {
      id: match_id,
      league_id: '1',
      home_team_id: '1',
      away_team_id: '2',
      match_date: new Date().toISOString(),
      status: 'completed',
      home_team: { name: 'Home Team' },
      away_team: { name: 'Away Team' },
      games: [
        {
          id: '1',
          match_id,
          game_number: 1,
          home_player: { id: '1', username: 'player1' },
          away_player: { id: '2', username: 'player2' },
          home_score: 75,
          away_score: 80,
          status: 'completed'
        },
        {
          id: '2',
          match_id,
          game_number: 2,
          home_player: { id: '3', username: 'player3' },
          away_player: { id: '2', username: 'player2' },
          home_score: 82,
          away_score: 78,
          status: 'completed'
        }
      ]
    };
  });

  return app;
} 