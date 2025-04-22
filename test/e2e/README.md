# End-to-End Tests for Golf League Backend

This directory contains end-to-end tests for the Golf League Backend API, testing the complete functionality from client to database.

## Running the Tests

You can run all E2E tests with the following command:

```bash
npm run test:e2e
```

Or run them from inside the test container with:

```bash
npm run test-in-container:e2e
```

## Test Structure

The E2E tests are organized into feature-specific test files:

- `auth.e2e-spec.ts` - Basic authentication (login, register)
- `communications.e2e-spec.ts` - System communications and messaging
- `league-memberships.e2e-spec.ts` - League membership management
- `leagues.e2e-spec.ts` - League management features
- `locations-bays.e2e-spec.ts` - Golf simulator bay management
- `locations.e2e-spec.ts` - Location and facility management
- `match-results.e2e-spec.ts` - Match result submission and processing
- `matches.e2e-spec.ts` - Match scheduling and management
- `notifications.e2e-spec.ts` - User notifications
- `password-reset.e2e-spec.ts` - Password reset functionality
- `password-reset-multi-user.e2e-spec.ts` - Password reset with multiple users
- `teams.e2e-spec.ts` - Team creation and management
- `users.e2e-spec.ts` - User management features

## Email Mocking

The password reset tests mock the email sending functionality to avoid sending real emails during testing. The mock keeps track of "sent" emails and their contents for verification in tests.

### Mock Implementation

The email service is mocked using Jest's module mocking system:

```typescript
// Mock must be defined before imports to work properly
jest.mock('../../../src/routes/email/email.service', () => {
  // Store sent emails for verification
  const sentEmails = [];
  
  return {
    // Need to mock the default export as well as the named export
    __esModule: true,
    default: {
      sendPasswordResetEmail: jest.fn(async (params) => {
        // Store the email for later verification
        sentEmails.push({
          recipient: params.recipientEmail,
          code: params.challengeCode
        });
        return { success: true, messageId: `mock-${Date.now()}` };
      }),
      __getSentEmails: () => sentEmails,
      __clearSentEmails: () => { sentEmails.length = 0; }
    },
    // This mocks the named export - the singleton instance
    emailService: {
      sendPasswordResetEmail: jest.fn(async (params) => {
        sentEmails.push({
          recipient: params.recipientEmail,
          code: params.challengeCode
        });
        return { success: true, messageId: `mock-${Date.now()}` };
      }),
      __getSentEmails: () => sentEmails,
      __clearSentEmails: () => { sentEmails.length = 0; }
    }
  };
});

// Import the module AFTER mocking
import { emailService } from '../../../src/routes/email/email.service';
```

This allows tests to:
1. Verify emails would have been sent to the right recipients
2. Capture reset codes for use in verification steps
3. Avoid sending actual emails during tests

## Test Data

The tests use seed data created in `helpers/seeder.ts`, which includes users with different roles, teams, leagues, and other required entities.

Key test users:
- Admin: `admin@example.com` / `admin123`
- Regular User 1: `user1@example.com` / `password123`
- Regular User 2: `user2@example.com` / `password123`

## Troubleshooting

### Email Mocking Issues

If tests involving email mocking are failing with errors like:
```
Expected: 1
Received: 0
```

It usually means the mock isn't being properly applied. Common solutions:

1. **Mock Order**: Always define the mock BEFORE importing the module being mocked. 
   The order matters in Jest.

2. **Mock Completeness**: The email service is exported both as a default and a named export.
   Make sure to mock both with the `__esModule: true` flag.

3. **Verification**: Add a simple test that directly calls the mocked function to verify
   the mock is working correctly:

   ```typescript
   test('email mocking is working correctly', async () => {
     await emailService.sendPasswordResetEmail({
       recipientEmail: 'test@example.com',
       username: 'testuser',
       challengeCode: '123456'
     });
     
     const sentEmails = mockedEmailService.__getSentEmails();
     expect(sentEmails.length).toBe(1);
   });
   ```

### Invalid Code Testing

When testing invalid codes, use a code that's definitely not valid (like '999999') 
instead of '000000' which might be a valid code generated randomly in a test.

## Adding New Tests

When adding new E2E tests:

1. Create a new file named `feature-name.e2e-spec.ts`
2. Import required helpers from `../helpers/setup`
3. If needed, mock any external services (like email)
4. Structure tests with clear, descriptive test names
5. Clean up after tests in `afterEach` or `afterAll` blocks 