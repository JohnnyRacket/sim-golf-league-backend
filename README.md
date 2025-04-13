# Golf Simulation League Backend

A TypeScript-based backend service for managing golf simulation leagues, built with Fastify and Kysely.

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd golf-sim-league-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=golf_league
DB_PORT=3306
```

4. Initialize the database:
```bash
mysql -u your_username -p < src/db/schema.sql
```

5. Build the project:
```bash
npm run build
```

6. Start the server:
```bash
npm start
```

For development with hot-reload:
```bash
npm run dev
```

## API Endpoints

### Health Check
- GET `/health` - Check if the service is running

### Users
- GET `/users` - List all users
- GET `/users/:id` - Get user by ID

### Leagues
- GET `/leagues` - List all leagues
- GET `/leagues/:id` - Get league by ID

More endpoints will be added for:
- Managers
- Locations
- Members
- Match History
- Stats
- Communications

## Database Schema

The database consists of the following tables:
- users
- managers
- locations
- leagues
- members
- match_history
- stats
- communications

Refer to `src/db/schema.sql` for detailed table structures and relationships.

## Development

To add new features or modify existing ones:

1. Create new routes in appropriate files under `src/routes/`
2. Update database schema if needed
3. Add new types to `src/types/`
4. Test your changes
5. Build and restart the server

## License

MIT 