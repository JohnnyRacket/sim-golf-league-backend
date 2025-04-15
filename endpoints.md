# Golf Simulation League API Endpoints

## Authentication

### POST /login
- **Description**: Login with email and password
- **Request Body**: 
  - `email`: string
  - `password`: string
- **Responses**:
  - 200: JWT token
  - 401: Invalid credentials
  - 500: Internal server error

### POST /register
- **Description**: Register a new user account
- **Request Body**:
  - `username`: string
  - `email`: string
  - `password`: string
- **Responses**:
  - 200: JWT token
  - 400: Username or email already exists
  - 500: Internal server error

## Users

### GET /users
- **Description**: Get all users (managers only)
- **Auth Required**: Yes (manager role)
- **Responses**:
  - 200: Array of users
  - 500: Internal server error

### GET /users/me
- **Description**: Get current user profile
- **Auth Required**: Yes
- **Responses**:
  - 200: User profile
  - 404: User not found
  - 500: Internal server error

### GET /users/me/dashboard
- **Description**: Get user dashboard data
- **Auth Required**: Yes
- **Responses**:
  - 200: User dashboard data
  - 500: Internal server error

### GET /users/:id
- **Description**: Get user by ID (admin/manager or self only)
- **Auth Required**: Yes
- **Params**: 
  - `id`: User ID
- **Responses**:
  - 200: User data
  - 403: Forbidden
  - 404: User not found
  - 500: Internal server error

### PUT /users/:id
- **Description**: Update user (self only)
- **Auth Required**: Yes
- **Params**: 
  - `id`: User ID
- **Request Body**: Update user data
- **Responses**:
  - 200: Success message
  - 403: Forbidden
  - 404: User not found
  - 500: Internal server error

## Teams

### GET /teams
- **Description**: Get all teams with optional league filtering
- **Auth Required**: Yes
- **Query Parameters**:
  - `league_id`: (optional) League ID
- **Responses**:
  - 200: Array of teams
  - 500: Internal server error

### GET /teams/my
- **Description**: Get teams the current user is a member of
- **Auth Required**: Yes
- **Responses**:
  - 200: Array of teams with member counts
  - 500: Internal server error

### GET /teams/join-requests/my
- **Description**: Get all join requests for the current user
- **Auth Required**: Yes
- **Responses**:
  - 200: Array of join requests
  - 500: Internal server error

### GET /teams/:id
- **Description**: Get team by ID with its members
- **Auth Required**: Yes
- **Params**:
  - `id`: Team ID
- **Responses**:
  - 200: Team details with members
  - 404: Team not found
  - 500: Internal server error

### POST /teams
- **Description**: Create a new team (manager only)
- **Auth Required**: Yes (manager role)
- **Request Body**:
  - `league_id`: League ID
  - `name`: Team name
  - `max_members`: Maximum members (default: 6)
  - `status`: Team status (default: 'active')
- **Responses**:
  - 201: Team created
  - 403: Not authorized
  - 500: Internal server error

### PUT /teams/:id
- **Description**: Update a team (manager only)
- **Auth Required**: Yes (manager role)
- **Params**:
  - `id`: Team ID
- **Request Body**: Update team data
- **Responses**:
  - 200: Success message
  - 403: Forbidden
  - 404: Team not found
  - 500: Internal server error

### POST /teams/:id/members
- **Description**: Add a member to a team (manager only)
- **Auth Required**: Yes (manager role)
- **Params**:
  - `id`: Team ID
- **Request Body**: Team member data
- **Responses**:
  - 201: Member added
  - 400: Bad request
  - 403: Forbidden
  - 404: Team not found
  - 500: Internal server error

## Leagues

### GET /leagues
- **Description**: Get all leagues
- **Auth Required**: Yes
- **Query Parameters**:
  - `location_id`: (optional) Location ID
- **Responses**:
  - 200: Array of leagues with location data
  - 500: Internal server error

### GET /leagues/my
- **Description**: Get leagues the current user is participating in
- **Auth Required**: Yes
- **Responses**:
  - 200: Array of user league memberships
  - 500: Internal server error

### GET /leagues/managed
- **Description**: Get leagues managed by the current user
- **Auth Required**: Yes (manager role)
- **Responses**:
  - 200: Array of leagues with location data
  - 500: Internal server error

### GET /leagues/:id/standings
- **Description**: Get standings for a league
- **Auth Required**: Yes
- **Params**:
  - `id`: League ID
- **Responses**:
  - 200: League standings
  - 404: League not found
  - 500: Internal server error

### GET /leagues/:id
- **Description**: Get league by ID with teams
- **Auth Required**: Yes
- **Params**:
  - `id`: League ID
- **Responses**:
  - 200: League details with teams
  - 404: League not found
  - 500: Internal server error

### POST /leagues
- **Description**: Create a new league (manager only)
- **Auth Required**: Yes (manager role)
- **Request Body**:
  - `name`: League name
  - `location_id`: Location ID
  - `start_date`: Start date
  - `end_date`: End date
  - `description`: Description
  - `max_teams`: Maximum teams (default: 8)
  - `simulator_settings`: Simulator settings
  - `status`: League status (default: 'pending')
- **Responses**:
  - 201: League created
  - 400: Bad request
  - 403: Forbidden
  - 500: Internal server error

### PUT /leagues/:id
- **Description**: Update a league (manager only)
- **Auth Required**: Yes (manager role)
- **Params**:
  - `id`: League ID
- **Request Body**: Update league data
- **Responses**:
  - 200: Success message
  - 403: Forbidden
  - 404: League not found
  - 500: Internal server error

### POST /leagues/request-membership
- **Description**: Request to join a league with a specific role
- **Auth Required**: Yes
- **Request Body**:
  - `league_id`: League ID
  - `requested_role`: Role requested ('player', 'spectator', or 'manager')
  - `message`: (optional) Message to league managers
- **Responses**:
  - 201: Success message
  - 400: Bad request - invalid role request
  - 404: League not found
  - 500: Internal server error

### GET /leagues/my-requests
- **Description**: Get current user's league membership requests
- **Auth Required**: Yes
- **Responses**:
  - 200: Array of user's membership requests
  - 500: Internal server error

### GET /leagues/:id/members
- **Description**: Get all members of a league
- **Auth Required**: Yes
- **Params**:
  - `id`: League ID
- **Responses**:
  - 200: Array of league members
  - 404: League not found
  - 500: Internal server error

### POST /leagues/:id/members
- **Description**: Add a user to a league with a specific role (managers only)
- **Auth Required**: Yes (league manager)
- **Params**:
  - `id`: League ID
- **Request Body**:
  - `user_id`: User ID to add
  - `role`: Role to assign ('player', 'spectator', or 'manager')
- **Responses**:
  - 201: Member added
  - 400: Bad request
  - 403: Not authorized to manage league members
  - 404: League not found
  - 500: Internal server error

### PUT /leagues/:id/members/:memberId
- **Description**: Update a league member's role (managers only)
- **Auth Required**: Yes (league manager)
- **Params**:
  - `id`: League ID
  - `memberId`: Member ID
- **Request Body**:
  - `role`: New role to assign ('player', 'spectator', or 'manager')
- **Responses**:
  - 200: Updated member
  - 403: Not authorized to manage league members
  - 404: League or member not found
  - 500: Internal server error

### DELETE /leagues/:id/members/:memberId
- **Description**: Remove a member from a league (managers only)
- **Auth Required**: Yes (league manager)
- **Params**:
  - `id`: League ID
  - `memberId`: Member ID
- **Responses**:
  - 200: Success message
  - 403: Not authorized to manage league members
  - 404: League or member not found
  - 500: Internal server error

### GET /leagues/:id/requests
- **Description**: Get league membership requests (managers only)
- **Auth Required**: Yes (league manager)
- **Params**:
  - `id`: League ID
- **Query Parameters**:
  - `status`: (optional) Request status ('pending', 'approved', 'rejected', 'cancelled')
- **Responses**:
  - 200: Array of membership requests
  - 403: Not authorized to view league requests
  - 404: League not found
  - 500: Internal server error

### POST /leagues/:id/requests/:requestId/approve
- **Description**: Approve a league membership request (managers only)
- **Auth Required**: Yes (league manager)
- **Params**:
  - `id`: League ID
  - `requestId`: Request ID
- **Responses**:
  - 200: Success message
  - 403: Not authorized to manage league requests
  - 404: League or request not found
  - 500: Internal server error

### POST /leagues/:id/requests/:requestId/reject
- **Description**: Reject a league membership request (managers only)
- **Auth Required**: Yes (league manager)
- **Params**:
  - `id`: League ID
  - `requestId`: Request ID
- **Responses**:
  - 200: Success message
  - 403: Not authorized to manage league requests
  - 404: League or request not found
  - 500: Internal server error

## Matches

### GET /matches/upcoming
- **Description**: Get upcoming matches for the current user
- **Auth Required**: Yes
- **Responses**:
  - 200: Array of upcoming matches
  - 500: Internal server error

### GET /matches
- **Description**: Get all matches with optional filtering
- **Auth Required**: Yes
- **Query Parameters**:
  - `league_id`: (optional) League ID
  - `team_id`: (optional) Team ID
  - `status`: (optional) Match status
  - `from_date`: (optional) Start date
  - `to_date`: (optional) End date
  - `user_id`: (optional) User ID
  - `include_stats`: (optional) Include stats flag
- **Responses**:
  - 200: Array of matches with team details
  - 500: Internal server error

### GET /matches/:id
- **Description**: Get match by ID with details
- **Auth Required**: Yes
- **Params**:
  - `id`: Match ID
- **Responses**:
  - 200: Enhanced match data
  - 404: Match not found
  - 500: Internal server error

### GET /matches/user/:user_id/summary
- **Description**: Get match summary for a specific user
- **Auth Required**: Yes
- **Params**:
  - `user_id`: User ID
- **Responses**:
  - 200: Array of user match summaries
  - 500: Internal server error

### GET /matches/me/summary
- **Description**: Get match summary for the current user
- **Auth Required**: Yes
- **Responses**:
  - 200: Array of user match summaries
  - 500: Internal server error

## Locations

### GET /locations
- **Description**: Get all locations
- **Auth Required**: Yes
- **Responses**:
  - 200: Array of locations
  - 500: Internal server error

### GET /locations/:id
- **Description**: Get location by ID
- **Auth Required**: Yes
- **Params**:
  - `id`: Location ID
- **Responses**:
  - 200: Location details
  - 404: Location not found
  - 500: Internal server error

### POST /locations
- **Description**: Create a new location (admin only)
- **Auth Required**: Yes (admin role)
- **Request Body**:
  - `name`: Location name
  - `address`: Location address
- **Responses**:
  - 201: Location created with owner assigned to current user
  - 500: Internal server error

### PUT /locations/:id
- **Description**: Update a location (admin or location owner only)
- **Auth Required**: Yes (admin role or location owner)
- **Params**:
  - `id`: Location ID
- **Request Body**: Update location data
- **Responses**:
  - 200: Success message
  - 403: Forbidden - user is not admin or owner
  - 404: Location not found
  - 500: Internal server error

### DELETE /locations/:id
- **Description**: Delete a location (admin or location owner only)
- **Auth Required**: Yes (admin role or location owner)
- **Params**:
  - `id`: Location ID
- **Responses**:
  - 200: Success message
  - 400: Cannot delete location with associated leagues
  - 403: Forbidden - user is not admin or owner
  - 404: Location not found
  - 500: Internal server error 