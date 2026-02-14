# Better-Auth Integration Guide

## Overview

The sim-golf-league backend uses **Better-Auth** for authentication with a stateless JWT architecture. All authentication is handled via better-auth endpoints with Rich JWT tokens containing entity-scoped roles.

## Authentication Architecture

### Key Features

- ✅ **Stateless JWT sessions** (no database queries for auth)
- ✅ **Rich JWT payload** with entity-scoped roles
- ✅ **JWT key rotation** (30-day interval with 30-day grace period)
- ✅ **JWKS endpoint** for stateless verification
- ✅ **bcrypt password hashing** (10 rounds)
- ✅ **Zero-DB authorization** (all permissions in JWT)

### Technology Stack

- **Better-Auth** v1.4.18+ with JWT plugin
- **Jose** library for JWT verification
- **Fastify 5** with Fetch API integration
- **PostgreSQL 15** for user/session storage

## Authentication Endpoints

### For Testing (Compatibility Endpoint)

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "username": "username"
  }
}
```

**Use Case**: E2E tests and quick authentication. Returns JWT in a single call.

---

### For Production Frontend (Better-Auth Native)

#### 1. Sign Up (Register)

```http
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "name": "username",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**: Session cookie set (15-minute expiry)

#### 2. Sign In (Login)

```http
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**: Session cookie set (15-minute expiry)

#### 3. Get JWT Token

```http
GET /api/auth/token
Cookie: session_data=...
```

**Response**:
```json
{
  "token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
}
```

**Note**: Requires active session cookie from sign-in.

#### 4. Sign Out

```http
POST /api/auth/sign-out
Cookie: session_data=...
```

**Response**: Session cookie cleared

---

### Token Refresh (Custom Endpoint)

When a user's roles change (joins a league, becomes team captain, etc.), refresh the JWT to get updated permissions:

```http
POST /auth/token/refresh
Authorization: Bearer <current-token>
```

**Response**:
```json
{
  "token": "new-jwt-with-updated-roles"
}
```

**Use Case**: Call after any action that modifies user roles (joining leagues, teams, etc.)

---

### Password Reset

#### 1. Request Reset

```http
POST /api/auth/forget-password
Content-Type: application/json

{
  "email": "user@example.com",
  "redirectTo": "/reset-password"
}
```

**Note**: Requires email provider configuration (AWS SES in production)

#### 2. Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "newpassword123"
}
```

---

### JWKS Endpoint (Public)

```http
GET /api/auth/jwks
```

**Response**:
```json
{
  "keys": [{
    "kty": "EdDSA",
    "use": "sig",
    "kid": "key-id",
    "crv": "Ed25519",
    "x": "base64-public-key"
  }]
}
```

**Use Case**: External services can verify JWTs by fetching public keys.

## JWT Structure (Rich JWT)

All JWTs include entity-scoped roles for zero-database authorization:

```json
{
  "id": "user-uuid",
  "username": "username",
  "email": "user@example.com",
  "platform_role": "user|admin",
  "locations": { "location-id": "owner" },
  "leagues": { "league-id": "manager|player|spectator" },
  "teams": { "team-id": "captain|member" },
  "iat": 1234567890,
  "exp": 1234654290,
  "iss": "http://localhost:3000",
  "aud": "http://localhost:3000"
}
```

### Role Types

**Platform Roles** (`platform_role`):
- `user` - Regular user
- `admin` - Platform administrator

**Location Roles** (`locations`):
- `owner` - Owns the location

**League Roles** (`leagues`):
- `manager` - Can manage league settings, teams, matches
- `player` - Can participate in matches
- `spectator` - View-only access

**Team Roles** (`teams`):
- `captain` - Can manage team roster
- `member` - Regular team member

## Frontend Integration

### Recommended Flow for SPAs and Mobile Apps

```javascript
// Option 1: Compatibility Endpoint (Simpler)
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const { token } = await loginResponse.json();
localStorage.setItem('auth_token', token);

// Option 2: Better-Auth Native (Production)
// Step 1: Sign in to create session
const signInResponse = await fetch('/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
  credentials: 'include', // Include cookies
});

// Step 2: Get JWT token
const tokenResponse = await fetch('/api/auth/token', {
  credentials: 'include', // Send session cookie
});

const { token } = await tokenResponse.json();
localStorage.setItem('auth_token', token);

// Step 3: Use token for API requests
const response = await fetch('/leagues/my', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// Step 4: Refresh token when roles change
const refreshResponse = await fetch('/auth/token/refresh', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const { token: newToken } = await refreshResponse.json();
localStorage.setItem('auth_token', newToken);
```

### Authorization Checks

The middleware automatically checks permissions based on JWT payload:

```javascript
// Examples of protected endpoints and required roles:

// Platform-level (requires platform_role: "admin")
GET /users                 // Admin only

// Location-level (requires locations[locationId]: "owner")
POST /locations/:id        // Location owner or admin

// League-level (requires leagues[leagueId]: "manager")
POST /leagues/:id/teams    // League manager or admin

// Team-level (requires teams[teamId]: "captain"|"member")
PUT /teams/:id             // Team captain or admin
```

## Security Features

### Production Requirements

1. **HTTPS Required** - All authentication must use HTTPS in production
2. **CORS Configured** - Set `CORS_ORIGINS` environment variable
3. **Short Session Lifetime** - 15-minute cookie cache, 24-hour JWT
4. **Private Key Encryption** - JWKS private keys encrypted in database
5. **Automatic Key Rotation** - JWT signing keys rotated every 30 days

### Token Best Practices

- Store JWTs securely (use secure storage, not localStorage in production)
- Include `Authorization: Bearer <token>` header on all API requests
- Refresh token before expiration for seamless UX
- Call `/auth/token/refresh` after role changes
- Tokens cannot be revoked server-side (stateless) - use short expiration times

### Session Management

- **Stateless sessions**: Cannot be revoked until natural expiration
- **Short-lived cookies**: 15-minute session cache minimizes risk
- **JWT expiration**: 24-hour lifetime (configurable)
- For security-critical operations: Require re-authentication

## Environment Variables

### Required

```env
# Better-Auth Configuration
BETTER_AUTH_SECRET=your-secret-key-here-min-32-chars
BETTER_AUTH_URL=http://localhost:3000  # Your app URL

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=golf_sim_league

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Optional (OAuth - Not Currently Enabled)

```env
# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Apple OAuth (optional)
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
```

### Email Provider (For Password Reset)

```env
# AWS SES (production)
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=
AWS_SES_SECRET_ACCESS_KEY=
AWS_SES_FROM_EMAIL=noreply@golfsimleague.com
```

## Development vs Production

### Development
- HTTP allowed (localhost)
- Session cookies: 15-minute expiry
- JWT tokens: 24-hour expiry
- Email: Console logging (no real emails sent)

### Production
- **HTTPS enforced**
- Email provider: AWS SES (required for password reset)
- Shorter JWT expiration recommended (1-6 hours)
- Monitor JWT size (Rich JWT can grow with many roles)
- Use secure cookie storage

## Testing

### E2E Tests

All E2E tests use the `/auth/login` compatibility endpoint:

```javascript
// From test helper
await api.login('user@example.com', 'password123');

// Token is automatically set for subsequent requests
const response = await api.get('/protected-endpoint');
```

### Manual Testing

```bash
# Sign up new user (compat endpoint)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use JWT in requests
TOKEN="<paste-token-here>"
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN"

# Verify JWKS endpoint (public)
curl http://localhost:3000/api/auth/jwks
```

## Troubleshooting

### Token Verification Fails

**Problem**: JWTs return 401 Unauthorized

**Solutions**:
- Verify JWKS endpoint is accessible: `GET /api/auth/jwks`
- Check token hasn't expired (24-hour lifetime)
- Ensure `iss` and `aud` claims match `BETTER_AUTH_URL`
- Verify middleware is using correct JWKS endpoint

### Password Reset Not Working

**Problem**: `/api/auth/forget-password` returns 404

**Solution**: Configure email provider (AWS SES) or use mock email sender in development

### Session Cookie Issues

**Problem**: `/api/auth/token` returns 401 after sign-in

**Solutions**:
- Ensure `credentials: 'include'` in fetch requests
- Check CORS allows cookies (`credentials: true`)
- Verify session cookie is set in sign-in response
- Use compatibility endpoint `/auth/login` for simpler flow

### JWT Size Too Large

**Problem**: Users with many roles have large JWTs

**Solutions**:
- Monitor JWT size in production
- Consider role pagination for users with 100+ entities
- Use shorter entity IDs if possible
- Implement role compaction strategies

## Migration from Custom Auth

The backend was migrated from a custom authentication system to better-auth. Key changes:

1. **Removed custom endpoints**:
   - ❌ `POST /auth/login` (replaced with `/auth/login` compat or `/api/auth/sign-in/email`)
   - ❌ `POST /auth/register` (replaced with `/api/auth/sign-up/email`)
   - ❌ `POST /auth/reset-password` (replaced with `/api/auth/forget-password`)
   - ❌ `POST /auth/refresh` (replaced with `/auth/token/refresh`)

2. **Added better-auth endpoints**:
   - ✅ `/api/auth/sign-in/email` - Better-auth native sign-in
   - ✅ `/api/auth/sign-up/email` - Better-auth native sign-up
   - ✅ `/api/auth/token` - Get JWT from session
   - ✅ `/api/auth/jwks` - Public key endpoint for verification
   - ✅ `/auth/login` - Compatibility endpoint (returns JWT directly)

3. **Database changes**:
   - ✅ Uses `account` table for credentials (better-auth)
   - ✅ Uses `jwks` table for JWT signing keys
   - ✅ Uses `verification` table for password reset
   - ✅ Removed `password_reset_challenges` table (no longer used)

## Support

For issues or questions about better-auth integration:

1. Check the [Better-Auth documentation](https://www.better-auth.com/docs)
2. Review this guide's troubleshooting section
3. Check the E2E tests for working examples
4. Open an issue in the project repository

## Version History

- **v1.0.0** (2026-02-14): Complete migration to better-auth
  - Stateless JWT architecture
  - Entity-scoped roles in JWT payload
  - JWKS-based verification
  - Key rotation support
  - 22/22 E2E test suites passing
