# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Deezer CDN SSL Certificate Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that direct requests to `https://cdn-images.dzcdn.net/images/cover/test/1000x1000-000000-80-0-0.jpg` fail with SSL certificate errors
  - Test that album cover components display broken image placeholders when using direct Deezer CDN URLs
  - Test that CSS background images fail to load from Deezer CDN
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (SSL certificate validation errors, CORS issues)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Deezer Image Loading Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-Deezer image URLs (local assets, other CDNs)
  - Observe that existing `/api` proxy routes continue to work correctly
  - Observe that user-uploaded images and avatars load normally
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for Deezer SSL certificate validation errors

  - [x] 3.1 Verify Vite proxy configuration is correct
    - Confirm `/cdn-images` proxy route exists in `web/vite.config.ts`
    - Verify target points to `https://cdn-images.dzcdn.net`
    - Verify `secure: false` is set to bypass SSL certificate validation
    - Verify `changeOrigin: true` is set for proper CORS handling
    - Verify path rewriting removes `/cdn-images` prefix correctly
    - _Bug_Condition: isBugCondition(input) where input.url starts with 'https://cdn-images.dzcdn.net'_
    - _Expected_Behavior: Images load successfully through proxy without SSL errors_
    - _Preservation: Non-Deezer images and API routes continue to work unchanged_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Update image URL references to use proxy path
    - Search for any remaining direct Deezer CDN URLs in components
    - Transform `https://cdn-images.dzcdn.net/images/cover/...` to `/cdn-images/images/cover/...`
    - Update any hardcoded Deezer CDN references in the codebase
    - Ensure all album cover displays use the proxy path
    - _Bug_Condition: Direct CDN URLs that bypass the proxy configuration_
    - _Expected_Behavior: All image requests go through the proxy to avoid SSL issues_
    - _Preservation: Existing image loading patterns for non-Deezer sources remain unchanged_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Deezer CDN SSL Certificate Success
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Deezer Image Loading Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify album cover images display correctly in the application
  - Verify no SSL certificate errors appear in browser console
  - Verify existing functionality (API calls, non-Deezer images) remains unchanged