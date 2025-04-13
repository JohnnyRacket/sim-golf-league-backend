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