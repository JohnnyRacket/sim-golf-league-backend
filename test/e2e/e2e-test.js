#!/usr/bin/env node

const { execSync } = require('child_process');
const chalk = require('chalk');

function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

// Capture command line arguments (everything after --)
const testArgs = process.argv.slice(2).join(' ');

console.log(chalk.cyan('🧪 Starting E2E tests...'));
console.log(chalk.yellow('🔧 Setting up test environment...'));

// Clean up any previous containers
console.log(chalk.yellow('🧹 Cleaning up previous containers...'));
runCommand('docker-compose -f docker-compose.e2e.yml down -v');

// Build and start the e2e test environment with arguments
console.log(chalk.green(`🚀 Starting Docker containers with args: ${testArgs}`));
// Pass the test arguments to the Docker environment using environment variables
const success = runCommand(`JEST_ARGS="${testArgs}" docker-compose -f docker-compose.e2e.yml up --build --abort-on-container-exit`);

// Clean up
console.log(chalk.yellow('🧹 Cleaning up test environment...'));
runCommand('docker-compose -f docker-compose.e2e.yml down -v');

console.log(chalk.cyan('✅ E2E tests completed!'));
process.exit(success ? 0 : 1);

async function cleanupTestData() {
  try {
    // Clear all test data
    await db.deleteFrom('notifications').execute();
    await db.deleteFrom('match_result_submissions').execute();
    await db.deleteFrom('matches').execute();
    await db.deleteFrom('team_members').execute(); 
    await db.deleteFrom('teams').execute();
    await db.deleteFrom('league_members').execute();
    await db.deleteFrom('league_membership_requests').execute();
    await db.deleteFrom('leagues').execute();
    await db.deleteFrom('locations').execute();
    await db.deleteFrom('owners').execute();
    await db.deleteFrom('users').execute();
    
    // Other cleanup as needed
    
    console.log('Test data cleanup completed');
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
} 