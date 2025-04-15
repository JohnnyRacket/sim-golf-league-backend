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

console.log(chalk.cyan('🧪 Starting E2E tests...'));
console.log(chalk.yellow('🔧 Setting up test environment...'));

// Clean up any previous containers
console.log(chalk.yellow('🧹 Cleaning up previous containers...'));
runCommand('docker-compose -f docker-compose.e2e.yml down -v');

// Build and start the e2e test environment
console.log(chalk.green('🚀 Starting Docker containers...'));
const success = runCommand('docker-compose -f docker-compose.e2e.yml up --build --abort-on-container-exit');

// Clean up
console.log(chalk.yellow('🧹 Cleaning up test environment...'));
runCommand('docker-compose -f docker-compose.e2e.yml down -v');

console.log(chalk.cyan('✅ E2E tests completed!'));
process.exit(success ? 0 : 1); 