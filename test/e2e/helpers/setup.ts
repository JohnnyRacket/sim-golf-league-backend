import { db } from '../../../src/db';
import { seed } from './seeder';
import { beforeAll, afterEach, afterAll } from '@jest/globals';

// Test setup config
export const API_URL = process.env.API_URL || 'http://localhost:3001';

let seedData: any = {};

beforeAll(async () => {
  console.log('Starting E2E test setup...');
  console.log(`Using API URL: ${API_URL}`);
  
  // Allow time for the server to be fully ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Seed the database
    seedData = await seed();
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
});

afterEach(async () => {
  // Any cleanup needed after each test
});

afterAll(async () => {
  console.log('Cleaning up E2E test environment...');
  
  try {
    // Clean up test data
    await db.deleteFrom('match_games').execute();
    await db.deleteFrom('matches').execute();
    await db.deleteFrom('team_members').execute();
    await db.deleteFrom('teams').execute();
    await db.deleteFrom('leagues').execute();
    await db.deleteFrom('locations').execute();
    await db.deleteFrom('managers').execute();
    await db.deleteFrom('users').execute();
    
    // Close database connection
    await db.destroy();
    console.log('Database cleanup completed');
  } catch (error) {
    console.error('Error cleaning up database:', error);
  }
});

// Export the seeded data for tests to use
export { seedData }; 