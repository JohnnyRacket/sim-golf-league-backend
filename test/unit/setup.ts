import { beforeAll, afterAll, jest } from '@jest/globals';

// Mock the database module
jest.mock('../../src/db', () => ({
  db: {
    selectFrom: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({
          execute: jest.fn(() => Promise.resolve([]))
        }))
      }))
    })),
    deleteFrom: jest.fn(() => ({
      execute: jest.fn(() => Promise.resolve([]))
    })),
    insertInto: jest.fn(() => ({
      values: jest.fn(() => ({
        execute: jest.fn(() => Promise.resolve({})),
        executeTakeFirst: jest.fn(() => Promise.resolve({ insertId: '1' }))
      }))
    })),
    destroy: jest.fn(() => Promise.resolve())
  }
}));

beforeAll(async () => {
  // Setup for tests
  console.log('Setting up test environment with mock database');
});

afterAll(async () => {
  // Clean up
  console.log('Cleaning up test environment');
}); 