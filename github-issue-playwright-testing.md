# GitHub Issue: Add automated frontend error logging tests with Playwright

**Labels:** testing, automation, playwright, frontend, error-logging

## Summary

Add automated end-to-end tests to verify frontend error logging system works correctly, replacing manual browser testing.

## Problem

Currently testing frontend error logging requires:
- Manual browser testing after each deployment  
- Manual console commands to trigger errors
- Manual verification of API calls and Cloud Logging
- Time-consuming and error-prone process

Recent issues caught:
- Import path resolution failures (relative vs @/ paths)
- Server vs client component execution context
- Global error handler initialization timing

## Proposed Solution

Implement Playwright E2E tests that automatically verify:

### Test Coverage Needed
- ✅ Global error handlers are properly initialized
- ✅ `window.onerror` and `unhandledrejection` handlers exist
- ✅ Thrown errors trigger API calls to `/api/client-errors`
- ✅ Component-specific errors (HomePage, ChatWindow) are captured
- ✅ API endpoint responds correctly with structured data
- ✅ Network failures vs JavaScript errors are handled properly

### Implementation Plan

1. **Install Playwright**
   ```bash
   npm install --save-dev @playwright/test
   npx playwright install
   ```

2. **Create Test Suite**
   ```javascript
   // tests/e2e/error-logging.spec.ts
   import { test, expect } from '@playwright/test';

   test('frontend error logging works end-to-end', async ({ page }) => {
     let apiCalled = false;
     
     // Listen for API calls to /api/client-errors
     page.on('request', request => {
       if (request.url().includes('/api/client-errors')) {
         apiCalled = true;
         console.log('✅ Error logging API called:', request.url());
       }
     });

     await page.goto('/');
     
     // Wait for app to load and logging to initialize
     await page.waitForTimeout(2000);

     // Check if global error handlers are set up
     const errorHandlerExists = await page.evaluate(() => {
       return window.onerror !== null;
     });
     
     expect(errorHandlerExists).toBe(true);

     // Throw an error to test logging
     await page.evaluate(() => {
       throw new Error('Test frontend logging - Playwright');
     });

     // Wait for potential API call
     await page.waitForTimeout(2000);

     // Verify the API was called
     expect(apiCalled).toBe(true);
   });

   test('component errors are logged', async ({ page }) => {
     let errorLogged = false;
     
     page.on('request', request => {
       if (request.url().includes('/api/client-errors')) {
         errorLogged = true;
       }
     });

     await page.goto('/');
     
     // Test HomePage error logging
     await page.evaluate(() => {
       // Simulate item matching error
       window.dispatchEvent(new ErrorEvent('error', {
         error: new Error('Item matching failed'),
         message: 'Item matching failed'
       }));
     });
     
     await page.waitForTimeout(1000);
     expect(errorLogged).toBe(true);
   });

   test('API endpoint responds correctly', async ({ page }) => {
     await page.goto('/');
     
     // Test API endpoint directly
     const response = await page.evaluate(async () => {
       const response = await fetch('/api/client-errors', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           message: 'Test error from Playwright',
           timestamp: new Date().toISOString(),
           component: 'PlaywrightTest'
         })
       });
       return response.json();
     });
     
     expect(response.success).toBe(true);
   });
   ```

3. **Create Playwright Config**
   ```javascript
   // playwright.config.ts
   import { defineConfig, devices } from '@playwright/test';

   export default defineConfig({
     testDir: './tests/e2e',
     fullyParallel: true,
     forbidOnly: !!process.env.CI,
     retries: process.env.CI ? 2 : 0,
     workers: process.env.CI ? 1 : undefined,
     reporter: 'html',
     use: {
       baseURL: 'http://localhost:3000',
       trace: 'on-first-retry',
     },
     projects: [
       {
         name: 'chromium',
         use: { ...devices['Desktop Chrome'] },
       },
     ],
     webServer: {
       command: 'npm run dev',
       url: 'http://localhost:3000',
       reuseExistingServer: !process.env.CI,
     },
   });
   ```

4. **Add NPM Scripts**
   ```json
   {
     "scripts": {
       "test:e2e": "playwright test",
       "test:e2e:ui": "playwright test --ui",
       "test:error-logging": "playwright test error-logging.spec.ts",
       "test:error-logging:headed": "playwright test error-logging.spec.ts --headed"
     }
   }
   ```

5. **CI Integration**
   ```yaml
   # .github/workflows/test-error-logging.yml
   name: Frontend Error Logging Tests
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - run: npm ci
         - run: npx playwright install --with-deps
         - run: npm run test:error-logging
   ```

## Benefits

- **Faster feedback**: Catch issues during development, not after deployment
- **Reliable testing**: Automated verification vs manual steps
- **CI Integration**: Run tests on every PR/push
- **Documentation**: Tests serve as executable documentation
- **Regression prevention**: Prevent future import/initialization issues
- **Cross-browser testing**: Verify error logging works across different browsers

## Acceptance Criteria

- [ ] Playwright test suite covers all error logging scenarios
- [ ] Tests can be run locally in development (`npm run test:error-logging`)
- [ ] Tests run in CI/CD pipeline on every PR
- [ ] Tests catch import path and initialization issues automatically
- [ ] Tests verify global error handlers are properly set up
- [ ] Tests verify API endpoint functionality
- [ ] Tests verify component-specific error logging
- [ ] Documentation updated with testing workflow
- [ ] Tests run in headless and headed modes for debugging

## Additional Context

This addresses the gap identified during the frontend error logging implementation where manual testing was required to verify the system worked end-to-end. Automated tests would have caught the import path and client/server execution context issues immediately.

**Issues that would have been caught automatically:**
1. Import path resolution (`../../utils/logging-init` vs `@/utils/logging-init`)
2. Server vs client component execution context
3. Global error handler initialization timing
4. API endpoint functionality verification

Related to the Google Cloud Logging integration work in the `google-cloud-logging` branch.

## Implementation Notes

- Tests should run against both local development server and deployed preview environments
- Consider adding visual regression testing for error states
- Add performance testing to ensure error logging doesn't impact app performance
- Include tests for different error types (JavaScript errors, Promise rejections, network failures)
- Add tests for error logging in different browser contexts and screen sizes