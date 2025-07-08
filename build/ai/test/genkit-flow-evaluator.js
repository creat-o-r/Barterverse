"use strict";
/**
 * Genkit-based flow testing for AI flows
 * Uses Genkit flows for testing instead of complex Jest mocks
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runItemMatchEvaluation = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load test cases
const testCasesPath = path_1.default.join(__dirname, '../test-data/item-match-test-cases.json');
const testCases = JSON.parse(fs_1.default.readFileSync(testCasesPath, 'utf8'));
// Helper function to evaluate a single test case
function evaluateTestCase(testCase, flowResult) {
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
    }
    else if (!expected.shouldFindMatches && matchFound) {
        testPassed = false;
        reasoning = `Expected no matches but found ${matchCount}. ${expected.reason}`;
    }
    else if (expected.expectedMatchCount && matchCount !== expected.expectedMatchCount) {
        testPassed = false;
        reasoning = `Expected ${expected.expectedMatchCount} matches but found ${matchCount}`;
    }
    else if (expected.expectedMatchedItemId) {
        const hasExpectedMatch = actualMatches.some((match) => match.itemId === expected.expectedMatchedItemId);
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
exports.runItemMatchEvaluation = genkit_1.ai.defineFlow({
    name: 'runItemMatchEvaluation',
    inputSchema: genkit_2.z.object({
        testCaseIndex: genkit_2.z.number().optional().describe('Index of specific test case to run, or run all if not specified')
    }),
    outputSchema: genkit_2.z.object({
        totalTests: genkit_2.z.number(),
        passedTests: genkit_2.z.number(),
        failedTests: genkit_2.z.number(),
        results: genkit_2.z.array(genkit_2.z.object({
            testName: genkit_2.z.string(),
            passed: genkit_2.z.boolean(),
            reasoning: genkit_2.z.string(),
            matchCount: genkit_2.z.number()
        }))
    })
}, async (input) => {
    const { suggestMatchingItems } = await Promise.resolve().then(() => __importStar(require('../flows/item-match-flow')));
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
            }
            else {
                failedTests++;
                console.log(`❌ ${testCase.name}: FAILED - ${evaluation.reasoning}`);
            }
        }
        catch (error) {
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
});
