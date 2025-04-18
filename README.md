# Golf Sim League Backend

A backend API for managing golf simulation leagues, teams, matches, and more.

## Features

- User authentication and authorization
- League management
- Team management
- Match scheduling and scoring
- Player statistics

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Running with Docker

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/golf-sim-league-backend.git
   cd golf-sim-league-backend
   ```

2. Start the application:
   ```
   docker-compose up
   ```

3. The API will be available at http://localhost:3000

### Development

For development, you can use the following commands:

```
# Start the application in development mode
docker-compose up

# Rebuild the application
docker-compose build

# Stop the application
docker-compose down

# View logs
docker-compose logs -f
```

## API Documentation

The API documentation will be available at http://localhost:3000/docs when the application is running.

## Environment Variables

- `NODE_ENV`: The environment (development, production, test)
- `DATABASE_URL`: The PostgreSQL connection string
- `JWT_SECRET`: The secret key for JWT token generation

## License

This project is licensed under the MIT License. 


# Endpoints:

For Regular Users
User Profile & Dashboard
GET /users/me - User's own profile and basic stats
GET /users/me/dashboard - Personalized dashboard showing upcoming matches, recent results, active leagues
Leagues & Teams
GET /leagues/my - Leagues user is participating in
GET /teams/my - Teams user is part of
GET /leagues/:id/standings - League standings table
Matches
GET /matches/upcoming - User's upcoming scheduled matches
GET /matches/:id - Detailed match information
GET /matches/:id/games - Games within a match
POST /matches/:match_id/games/:game_id/score - Submit game score (if allowed)
Stats & History
GET /stats/me - Personal performance statistics
GET /stats/me/trends - Performance trends over time
GET /match-history/me - Simplified personal match history
GET /match-history/me/detail - Detailed personal match history
For Managers
Location Management
GET /locations/my - Locations managed by user
POST /locations - Create a new location
PUT /locations/:id - Update location details
League Management
GET /admin/leagues - All leagues at manager's locations
POST /leagues - Create a new league (already exists)
PUT /leagues/:id - Update league (already exists)
POST /leagues/:id/schedule - Generate match schedule
GET /leagues/:id/members - All players in a league
Team Management
GET /admin/teams - All teams at manager's locations
POST /teams - Create a new team
PUT /teams/:id - Update team details
POST /teams/:id/members - Add member to team
DELETE /teams/:id/members/:member_id - Remove member from team
Match Management
POST /matches - Create/schedule a match
PUT /matches/:id - Update match details
PUT /matches/:id/status - Update match status
GET /admin/matches/pending-verification - Matches needing score verification
This structure:
Separates regular user and admin functionality
Groups related functions together
Uses intuitive paths for mobile navigation
Follows RESTful conventions
Builds on your existing endpoints

## Simulator Settings

Each league can have default simulator settings that will be applied to matches created within that league. When creating a match, you can either:

1. Provide specific simulator settings for that match, which will override the league defaults
2. Omit simulator settings, in which case the match will inherit settings from its league

### Examples of simulator settings

```json
{
  "difficulty": "pro",
  "weather": "random",
  "course": "St Andrews",
  "windSpeed": 10, 
  "enableHandicaps": true
}
```

The simulator settings are stored as a JSONB field in the database, allowing for flexible schema evolution without requiring database migrations for each change to the settings structure.

