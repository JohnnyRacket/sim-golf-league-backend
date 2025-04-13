import { db } from '../db';
import '@types/jest';

beforeAll(async () => {
  // Ensure database connection
  await db.selectFrom('users').select('id').limit(1).execute();
});

beforeEach(async () => {
  // Clean up test data
  await db.deleteFrom('match_games').execute();
  await db.deleteFrom('matches').execute();
  await db.deleteFrom('stats').execute();
  await db.deleteFrom('team_members').execute();
  await db.deleteFrom('teams').execute();
  await db.deleteFrom('leagues').execute();
  await db.deleteFrom('locations').execute();
  await db.deleteFrom('managers').execute();
  await db.deleteFrom('users').execute();
});

afterAll(async () => {
  // Close database connection
  await db.destroy();
}); 