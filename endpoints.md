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
- **Description**: Get all users (owners only)
- **Auth Required**: Yes (owner role)
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
- **Description**: Get user by ID (owner or self only)
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

### PUT /teams/:id/members/:memberId
- **Description**: Update a team member's role (manager only)
- **Auth Required**: Yes (manager role)
- **Params**:
  - `id`: Team ID
  - `memberId`: Member ID
- **Request Body**: 
  - `role`: New role to assign ('member')
- **Responses**:
  - 200: Updated member
  - 403: Not authorized
  - 404: Team or member not found
  - 500: Internal server error

### DELETE /teams/:id/members/:memberId
- **Description**: Remove a member from a team (manager only)
- **Auth Required**: Yes (manager role)
- **Params**:
  - `id`: Team ID
  - `memberId`: Member ID
- **Responses**:
  - 200: Success message
  - 403: Not authorized
  - 404: Team or member not found
  - 500: Internal server error

### POST /teams/join
- **Description**: Request to join a team (must be a league member)
- **Auth Required**: Yes
- **Request Body**:
  - `team_id`: Team ID
- **Responses**:
  - 201: Join request submitted
  - 400: Bad request (already a member or team at capacity)
  - 403: Not a league member
  - 404: Team not found
  - 500: Internal server error

### GET /teams/:id/join-requests
- **Description**: Get join requests for a team (team members or league managers)
- **Auth Required**: Yes (manager role or team membership)
- **Params**:
  - `id`: Team ID
- **Responses**:
  - 200: Array of join requests
  - 403: Not authorized
  - 404: Team not found
  - 500: Internal server error

### POST /teams/:id/join-requests/:requestId/approve
- **Description**: Approve a join request (team members or league managers)
- **Auth Required**: Yes (manager role or team membership)
- **Params**:
  - `id`: Team ID
  - `requestId`: Request ID
- **Responses**:
  - 200: Member added
  - 400: Team at capacity
  - 403: Not authorized
  - 404: Team or request not found
  - 500: Internal server error

### POST /teams/:id/join-requests/:requestId/reject
- **Description**: Reject a join request (team members or league managers)
- **Auth Required**: Yes (manager role or team membership)
- **Params**:
  - `id`: Team ID
  - `requestId`: Request ID
- **Responses**:
  - 200: Success message
  - 403: Not authorized
  - 404: Team or request not found
  - 500: Internal server error

### POST /teams/join-requests/:requestId/cancel
- **Description**: Cancel your own pending join request
- **Auth Required**: Yes
- **Params**:
  - `requestId`: Request ID
- **Responses**:
  - 200: Success message
  - 404: Request not found or already processed
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
  - `scheduling_format`: Format for scheduling matches (default: 'round_robin')
  - `playoff_format`: Format for playoffs (default: 'none')
  - `playoff_size`: Number of teams in playoffs (default: 0)
  - `prize_breakdown`: JSON object detailing prize distribution
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

### POST /leagues/:id/generate-schedule
- **Description**: Generate a schedule for a league (manager only)
- **Auth Required**: Yes (manager role)
- **Params**:
  - `id`: League ID
- **Responses**:
  - 200: Success message with number of matches created
  - 400: Bad request - insufficient teams
  - 403: Forbidden
  - 404: League not found
  - 500: Internal server error

### POST /leagues/:id/join
- **Description**: Request to join a league with a specific role
- **Auth Required**: Yes
- **Params**:
  - `id`: League ID
- **Request Body**:
  - `requested_role`: Role requested ('player', 'spectator', or 'manager')
  - `message`: (optional) Message to league managers
- **Responses**:
  - 201: Success message
  - 400: Bad request - invalid role request or existing request/membership
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

### GET /leagues/:id/join-requests
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
  - 200: Array of upcoming matches with format details
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
  - 200: Array of matches with team details and format information
  - 500: Internal server error

### GET /matches/:id
- **Description**: Get match by ID with details
- **Auth Required**: Yes
- **Params**:
  - `id`: Match ID
- **Responses**:
  - 200: Enhanced match data including format settings
  - 404: Match not found
  - 500: Internal server error

### POST /matches
- **Description**: Create a new match (admin or manager only)
- **Auth Required**: Yes (admin or manager role)
- **Request Body**:
  - `league_id`: League ID
  - `home_team_id`: Home team ID
  - `away_team_id`: Away team ID
  - `match_date`: Match date/time
  - `simulator_settings`: (optional) Simulator settings
  - `status`: (optional) Match status (default: 'scheduled')
  - `game_format`: (optional) Game format type ('scramble', 'best_ball', 'alternate_shot', 'individual')
  - `match_format`: (optional) Match format type ('stroke_play', 'match_play')
  - `scoring_format`: (optional) Scoring format type ('net', 'gross')
- **Responses**:
  - 201: Match created
  - 400: Invalid input
  - 403: Forbidden - user is not admin or manager
  - 404: League or team not found
  - 500: Internal server error

### PUT /matches/:id
- **Description**: Update a match (admin or manager only)
- **Auth Required**: Yes (admin or manager role)
- **Params**:
  - `id`: Match ID
- **Request Body**:
  - `match_date`: (optional) New match date/time
  - `simulator_settings`: (optional) Updated simulator settings
  - `status`: (optional) Updated match status
  - `game_format`: (optional) Game format type ('scramble', 'best_ball', 'alternate_shot', 'individual')
  - `match_format`: (optional) Match format type ('stroke_play', 'match_play')
  - `scoring_format`: (optional) Scoring format type ('net', 'gross')
- **Responses**:
  - 200: Success message
  - 403: Forbidden - user is not admin or manager
  - 404: Match not found
  - 500: Internal server error

### PUT /matches/league/:league_id/day
- **Description**: Bulk update matches for a specific day of a league (admin or manager only)
- **Auth Required**: Yes (admin or manager role)
- **Params**:
  - `league_id`: League ID
- **Request Body**:
  - `date`: Date in YYYY-MM-DD format for which to update matches
  - `new_date`: (optional) New date to move matches to
  - `game_format`: (optional) Game format type ('scramble', 'best_ball', 'alternate_shot', 'individual')
  - `match_format`: (optional) Match format type ('stroke_play', 'match_play')
  - `scoring_format`: (optional) Scoring format type ('net', 'gross')
- **Responses**:
  - 200: Success message with number of matches updated and details
  - 400: At least one update field must be provided
  - 403: Forbidden - user is not admin or manager
  - 404: No matches found for the specified date or league not found
  - 500: Internal server error
- **Note**: When updating match dates, the system automatically creates a communication and notifies all league members of the schedule change

### PUT /matches/:id/result
- **Description**: Submit match results (admin or manager only)
- **Auth Required**: Yes (admin or manager role)
- **Params**:
  - `id`: Match ID
- **Request Body**:
  - `games`: Array of game results with player IDs and scores
  - `status`: Match status (usually 'completed')
- **Responses**:
  - 200: Success message
  - 403: Forbidden - user is not admin or manager
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

## Communications

### GET /communications
- **Description**: Get all communications
- **Auth Required**: Yes
- **Responses**:
  - 200: Array of communications
  - 500: Internal server error

### GET /communications/:id
- **Description**: Get communication by ID
- **Auth Required**: Yes
- **Params**:
  - `id`: Communication ID
- **Responses**:
  - 200: Communication details
  - 404: Communication not found
  - 500: Internal server error

### GET /communications/league/:leagueId
- **Description**: Get all communications for a specific league
- **Auth Required**: Yes
- **Params**:
  - `leagueId`: League ID
- **Responses**:
  - 200: Array of league communications
  - 500: Internal server error

### POST /communications
- **Description**: Create a new communication
- **Auth Required**: Yes
- **Request Body**:
  - `recipientType`: Type of recipient ('league', 'team', or 'user')
  - `recipientId`: ID of the recipient
  - `type`: Communication type ('system', 'league', 'maintenance', 'advertisement', 'schedule')
  - `title`: Communication title
  - `message`: Communication message
  - `expirationDate`: (optional) Date when the communication expires
  - `senderId`: (optional) ID of the sender (null for anonymous)
- **Responses**:
  - 200: Newly created communication
  - 500: Internal server error
- **Note**: Creating a communication for a league automatically notifies all league members

### DELETE /communications/:id
- **Description**: Delete a communication
- **Auth Required**: Yes (admin or sender)
- **Params**:
  - `id`: Communication ID
- **Responses**:
  - 200: Success message with deleted communication details
  - 404: Communication not found
  - 500: Internal server error

## Notifications

### GET /notifications
- **Description**: Get all notifications for the current user
- **Auth Required**: Yes
- **Responses**:
  - 200: Array of notifications
  - 500: Internal server error

### GET /notifications/unread-count
- **Description**: Get count of unread notifications for the current user
- **Auth Required**: Yes
- **Responses**:
  - 200: Object with count property
  - 500: Internal server error

### GET /notifications/:id
- **Description**: Get notification by ID (only if owned by the current user)
- **Auth Required**: Yes
- **Params**:
  - `id`: Notification ID
- **Responses**:
  - 200: Notification details
  - 403: Forbidden - not your notification
  - 404: Notification not found
  - 500: Internal server error

### PATCH /notifications/:id
- **Description**: Mark a notification as read/unread
- **Auth Required**: Yes
- **Params**:
  - `id`: Notification ID
- **Request Body**:
  - `is_read`: Boolean indicating read status
- **Responses**:
  - 200: Updated notification
  - 403: Forbidden - not your notification
  - 404: Notification not found
  - 500: Internal server error

### POST /notifications/mark-all-read
- **Description**: Mark all notifications as read for the current user
- **Auth Required**: Yes
- **Responses**:
  - 200: Success message
  - 500: Internal server error

### DELETE /notifications/:id
- **Description**: Delete a notification
- **Auth Required**: Yes
- **Params**:
  - `id`: Notification ID
- **Responses**:
  - 200: Success message
  - 403: Forbidden - not your notification
  - 404: Notification not found
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