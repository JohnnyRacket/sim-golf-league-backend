import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sql } from 'kysely';
import { db } from '../../db';

interface MatchFilters {
  league_id: string;
  team_id?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export async function matchHistoryRoutes(fastify: FastifyInstance) {
  // Get match history by league ID with optional team or user filter
  fastify.get('/league/:league_id', async (request: FastifyRequest<{
    Params: { league_id: string },
    Querystring: { team_id?: string; user_id?: string }
  }>, reply: FastifyReply) => {
    const { league_id } = request.params;
    const { team_id, user_id } = request.query;
    
    let query = db.selectFrom('matches')
      .innerJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
      .innerJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
      .leftJoin('match_games', 'match_games.match_id', 'matches.id')
      .select([
        'matches.id',
        'matches.match_date',
        'matches.status',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        sql<number>`SUM(CASE WHEN match_games.home_score > match_games.away_score THEN 1 ELSE 0 END)`.as('home_games_won'),
        sql<number>`SUM(CASE WHEN match_games.away_score > match_games.home_score THEN 1 ELSE 0 END)`.as('away_games_won')
      ])
      .where('matches.league_id', '=', parseInt(league_id));

    if (team_id) {
      query = query.where((eb) => eb.or([
        eb('matches.home_team_id', '=', parseInt(team_id)),
        eb('matches.away_team_id', '=', parseInt(team_id))
      ]));
    }

    if (user_id) {
      query = query
        .innerJoin('match_games as user_games', 'user_games.match_id', 'matches.id')
        .innerJoin('team_members as player', (join) => 
          join.on((eb) => eb.or([
            eb('player.id', '=', 'user_games.home_player_id'),
            eb('player.id', '=', 'user_games.away_player_id')
          ]))
        )
        .where('player.user_id', '=', parseInt(user_id));
    }

    const matches = await query
      .groupBy([
        'matches.id',
        'matches.match_date',
        'matches.status',
        'home_team.name',
        'away_team.name'
      ])
      .orderBy('matches.match_date', 'desc')
      .execute();

    return matches;
  });

  // Get match history by league ID and date range
  fastify.get('/league/:league_id/date-range', async (request: FastifyRequest<{
    Params: { league_id: string },
    Querystring: { start_date: string; end_date: string }
  }>, reply: FastifyReply) => {
    const { league_id } = request.params;
    const { start_date, end_date } = request.query;

    if (!start_date || !end_date) {
      reply.code(400).send({ error: 'Both start_date and end_date are required' });
      return;
    }

    const matches = await db.selectFrom('matches')
      .innerJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
      .innerJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
      .leftJoin('match_games', 'match_games.match_id', 'matches.id')
      .select([
        'matches.id',
        'matches.match_date',
        'matches.status',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name',
        sql<number>`SUM(CASE WHEN match_games.home_score > match_games.away_score THEN 1 ELSE 0 END)`.as('home_games_won'),
        sql<number>`SUM(CASE WHEN match_games.away_score > match_games.home_score THEN 1 ELSE 0 END)`.as('away_games_won')
      ])
      .where('matches.league_id', '=', parseInt(league_id))
      .where('matches.match_date', '>=', new Date(start_date))
      .where('matches.match_date', '<=', new Date(end_date))
      .groupBy([
        'matches.id',
        'matches.match_date',
        'matches.status',
        'home_team.name',
        'away_team.name'
      ])
      .orderBy('matches.match_date', 'desc')
      .execute();

    return matches;
  });

  // Get user's match history summary by league
  fastify.get('/user/:user_id/summary', async (request: FastifyRequest<{
    Params: { user_id: string }
  }>, reply: FastifyReply) => {
    const { user_id } = request.params;
    const userId = parseInt(user_id);

    const summary = await db.selectFrom('team_members')
      .innerJoin('teams', 'teams.id', 'team_members.team_id')
      .innerJoin('leagues', 'leagues.id', 'teams.league_id')
      .leftJoin('match_games', (join) => 
        join.on((eb) => eb.or([
          eb('match_games.home_player_id', '=', 'team_members.id'),
          eb('match_games.away_player_id', '=', 'team_members.id')
        ]))
      )
      .select([
        'leagues.id as league_id',
        'leagues.name as league_name',
        'teams.id as team_id',
        'teams.name as team_name',
        sql<number>`COUNT(DISTINCT match_games.match_id)`.as('matches_played'),
        sql<number>`
          SUM(CASE 
            WHEN match_games.home_player_id = team_members.id AND match_games.home_score > match_games.away_score THEN 1
            WHEN match_games.away_player_id = team_members.id AND match_games.away_score > match_games.home_score THEN 1
            ELSE 0
          END)
        `.as('games_won'),
        sql<number>`
          AVG(CASE 
            WHEN match_games.home_player_id = team_members.id THEN match_games.home_score
            WHEN match_games.away_player_id = team_members.id THEN match_games.away_score
            ELSE NULL
          END)
        `.as('average_score')
      ])
      .where('team_members.user_id', '=', userId)
      .groupBy([
        'leagues.id',
        'leagues.name',
        'teams.id',
        'teams.name'
      ])
      .execute();

    return summary;
  });

  // Get match details including individual games
  fastify.get('/match/:match_id', async (request: FastifyRequest<{
    Params: { match_id: string }
  }>, reply: FastifyReply) => {
    const { match_id } = request.params;
    const matchId = parseInt(match_id);

    // Get match details
    const match = await db.selectFrom('matches')
      .innerJoin('teams as home_team', 'home_team.id', 'matches.home_team_id')
      .innerJoin('teams as away_team', 'away_team.id', 'matches.away_team_id')
      .select([
        'matches.id',
        'matches.match_date',
        'matches.status',
        'home_team.name as home_team_name',
        'away_team.name as away_team_name'
      ])
      .where('matches.id', '=', matchId)
      .executeTakeFirst();

    if (!match) {
      reply.code(404).send({ error: 'Match not found' });
      return;
    }

    // Get individual games
    const games = await db.selectFrom('match_games')
      .innerJoin('team_members as home_player', 'home_player.id', 'match_games.home_player_id')
      .innerJoin('team_members as away_player', 'away_player.id', 'match_games.away_player_id')
      .innerJoin('users as home_user', 'home_user.id', 'home_player.user_id')
      .innerJoin('users as away_user', 'away_user.id', 'away_player.user_id')
      .select([
        'match_games.game_number',
        'match_games.status',
        'match_games.home_score',
        'match_games.away_score',
        'home_user.username as home_player_name',
        'away_user.username as away_player_name'
      ])
      .where('match_games.match_id', '=', matchId)
      .orderBy('match_games.game_number')
      .execute();

    return {
      ...match,
      games
    };
  });
} 