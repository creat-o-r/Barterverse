/**
 * Genkit-based flow testing for AI flows
 * Uses Genkit flows for testing instead of complex Jest mocks
 */

import { ai } from '../genkit';
import { z } from 'genkit';
import fs from 'fs';
import path from 'path';

// Load test cases
const testCasesPath = path.join(__dirname, '../test-data/item-match-test-cases.json');
const testCases = JSON.parse(fs.readFileSync(testCasesPath, 'utf8'));

// Helper function to evaluate a single test case
function evaluateTestCase(testCase: any, flowResult: any) {
  const expected = testCase.expectedBehavior;
  const actualMatches = flowResult.suggestedMatches || [];
  
  // Basic validation
  const matchFound = actualMatches.length > 0;
  const matchCount = actualMatches.length;
  
  // Check if test passed based on expectations
  let testPassed = true;
  let reasoning = '';
  
  if (expected.shouldFindMatches && !matchFound) {
    testPassed = false;
    reasoning = `Expected matches but none found. Expected: ${expected.reason}`;
  } else if (!expected.shouldFindMatches && matchFound) {
    testPassed = false;
    reasoning = `Expected no matches but found ${matchCount}. ${expected.reason}`;
  } else if (expected.expectedMatchCount && matchCount !== expected.expectedMatchCount) {
    testPassed = false;
    reasoning = `Expected ${expected.expectedMatchCount} matches but found ${matchCount}`;
  } else if (expected.expectedMatchedItemId) {
    const hasExpectedMatch = actualMatches.some((match: any) => match.itemId === expected.expectedMatchedItemId);
    if (!hasExpectedMatch) {
      testPassed = false;
      reasoning = `Expected match with item ${expected.expectedMatchedItemId} but not found`;
    }
  }
  
  if (testPassed) {
    reasoning = `Test passed: ${expected.reason}`;
  }
  
  return {
    testPassed,
    reasoning,
    matchFound,
    matchCount,
    matchQuality: testPassed ? 'High' : 'Low'
  };
}

// Define a flow for running evaluations
export const runItemMatchEvaluation = ai.defineFlow(
  {
    name: 'runItemMatchEvaluation',
    inputSchema: z.object({
      testCaseIndex: z.number().optional().describe('Index of specific test case to run, or run all if not specified')
    }),
    outputSchema: z.object({
      totalTests: z.number(),
      passedTests: z.number(),
      failedTests: z.number(),
      results: z.array(z.object({
        testName: z.string(),
        passed: z.boolean(),
        reasoning: z.string(),
        matchCount: z.number()
      }))
    })
  },
  async (input) => {
    const { suggestMatchingItems } = await import('../flows/item-match-flow');
    
    const testCasesToRun = input.testCaseIndex !== undefined 
      ? [testCases[input.testCaseIndex]]
      : testCases;
    
    const results = [];
    let passedTests = 0;
    let failedTests = 0;
    
    for (const testCase of testCasesToRun) {
      try {
        console.log(`Running test: ${testCase.name}`);
        
        // Run the actual flow
        const flowResult = await suggestMatchingItems(testCase.input);
        
        // Evaluate the result using our helper function
        const evaluation = evaluateTestCase(testCase, flowResult);
        
        const result = {
          testName: testCase.name,
          passed: evaluation.testPassed,
          reasoning: evaluation.reasoning,
          matchCount: evaluation.matchCount
        };
        
        results.push(result);
        
        if (evaluation.testPassed) {
          passedTests++;
          console.log(`✅ ${testCase.name}: PASSED`);
        } else {
          failedTests++;
          console.log(`❌ ${testCase.name}: FAILED - ${evaluation.reasoning}`);
        }
        
      } catch (error) {
        failedTests++;
        const errorResult = {
          testName: testCase.name,
          passed: false,
          reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          matchCount: 0
        };
        results.push(errorResult);
        console.log(`❌ ${testCase.name}: ERROR - ${errorResult.reasoning}`);
      }
    }
    
    const totalTests = testCasesToRun.length;
    
    console.log(`\n📊 Test Summary:`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    return {
      totalTests,
      passedTests,
      failedTests,
      results
    };
  }
);