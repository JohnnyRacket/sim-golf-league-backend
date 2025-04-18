#!/usr/bin/env node

/**
 * Custom Jest reporter that provides a clear summary of test failures
 */
class SummaryReporter {
  constructor(globalConfig, reporterOptions) {
    this.globalConfig = globalConfig;
    this.reporterOptions = reporterOptions || {};
    this.failures = [];
  }

  onTestResult(test, testResult) {
    if (testResult.numFailingTests > 0) {
      const failingTests = testResult.testResults.filter(t => t.status === 'failed');
      
      failingTests.forEach(failingTest => {
        this.failures.push({
          title: failingTest.title,
          fullName: failingTest.fullName,
          filePath: testResult.testFilePath,
          failureMessage: failingTest.failureMessages.join('\n')
        });
      });
    }
  }

  extractExpectedAndReceived(failureMessage) {
    const lines = failureMessage.split('\n');
    let expected = null;
    let received = null;
    let expectedPath = null;
    let expectedValue = null;
    let receivedValue = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match the standard Expected:/Received: pattern
      if (line.startsWith('Expected:')) {
        expected = lines[i].replace('Expected:', '').trim();
        // Look for multi-line expected values
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('Received:')) {
          if (lines[j].trim()) {
            expected += '\n      ' + lines[j].trim();
          }
          j++;
        }
      }
      
      if (line.startsWith('Received:')) {
        received = lines[i].replace('Received:', '').trim();
        // Look for multi-line received values
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('Expected:') && !lines[j].includes('at ')) {
          if (lines[j].trim() && !lines[j].includes('npm ERR!')) {
            received += '\n      ' + lines[j].trim();
          }
          j++;
        }
      }
      
      // Match the Expected path/value and Received value pattern
      if (line.startsWith('Expected path:')) {
        expectedPath = lines[i].replace('Expected path:', '').trim();
      }
      
      if (line.startsWith('Expected value:')) {
        expectedValue = lines[i].replace('Expected value:', '').trim();
      }
      
      if (line.startsWith('Received value:')) {
        receivedValue = lines[i].replace('Received value:', '').trim();
      }
    }
    
    return { 
      expected, 
      received,
      expectedPath,
      expectedValue,
      receivedValue
    };
  }

  onRunComplete() {
    if (this.failures.length === 0) {
      console.log('\n\n✅ All tests passed successfully!\n');
      return;
    }

    console.log('\n\n🔴 Test Failures Summary 🔴');
    console.log('========================\n');
    console.log(`Total failures: ${this.failures.length}\n`);
    
    this.failures.forEach((failure, index) => {
      console.log(`${index + 1}) ${failure.fullName}`);
      console.log(`   File: ${failure.filePath.split('/').slice(-3).join('/')}`);
      
      // Extract just the error message without the stack trace
      const errorLines = failure.failureMessage.split('\n');
      const errorMessage = errorLines[0];
      console.log(`   Error: ${errorMessage}`);
      
      // Extract and display expected and received values
      const { expected, received, expectedPath, expectedValue, receivedValue } = 
        this.extractExpectedAndReceived(failure.failureMessage);
      
      // Standard format
      if (expected !== null) {
        console.log(`   Expected: ${expected}`);
      }
      if (received !== null) {
        console.log(`   Received: ${received}`);
      }
      
      // Path/value format
      if (expectedPath !== null) {
        console.log(`   Expected path: ${expectedPath}`);
      }
      if (expectedValue !== null) {
        console.log(`   Expected value: ${expectedValue}`);
      }
      if (receivedValue !== null) {
        console.log(`   Received value: ${receivedValue}`);
      }
      
      console.log();
    });
    
    console.log('For detailed error information, see the full test output above.');
  }
}

module.exports = SummaryReporter; 