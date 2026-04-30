# Deezer SSL Certificate Fix Bugfix Design

## Overview

This bugfix addresses SSL certificate validation errors that prevent album cover images from loading from the Deezer CDN (cdn-images.dzcdn.net). The error `net::ERR_CERT_AUTHORITY_INVALID` occurs when the React frontend attempts to load images directly from the Deezer CDN, resulting in broken image placeholders throughout the music interface. The fix implements a Vite proxy configuration to route image requests through the development server, bypassing SSL certificate validation issues while maintaining security best practices.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when image requests are made directly to https://cdn-images.dzcdn.net from the frontend
- **Property (P)**: The desired behavior when images are requested - successful loading and display of album artwork
- **Preservation**: Existing image loading from other domains and API functionality that must remain unchanged by the fix
- **Vite Proxy**: The development server proxy configuration that intercepts and forwards requests to external domains
- **SSL Certificate Validation**: The browser's verification of SSL certificates for HTTPS requests
- **Deezer CDN**: The content delivery network (cdn-images.dzcdn.net) that hosts album cover images

## Bug Details

### Bug Condition

The bug manifests when the React frontend attempts to load album cover images directly from the Deezer CDN. The browser's SSL certificate validation fails for cdn-images.dzcdn.net, causing image loading to fail with `net::ERR_CERT_AUTHORITY_INVALID`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ImageRequest
  OUTPUT: boolean
  
  RETURN input.url STARTS_WITH 'https://cdn-images.dzcdn.net'
         AND input.requestOrigin = 'frontend'
         AND sslCertificateValidation(input.url) = INVALID
END FUNCTION
```

### Examples

- **Direct CDN Request**: `https://cdn-images.dzcdn.net/images/cover/abc123/1000x1000-000000-80-0-0.jpg` → `net::ERR_CERT_AUTHORITY_INVALID`
- **Album Cover Component**: `<img src="https://cdn-images.dzcdn.net/images/cover/def456/500x500-000000-80-0-0.jpg" />` → Broken image placeholder
- **Background Image CSS**: `background-image: url(https://cdn-images.dzcdn.net/images/cover/ghi789/250x250-000000-80-0-0.jpg)` → No background displayed
- **Lyrics Panel Background**: Cover image fails to load, showing fallback empty state

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Image loading from other domains with valid SSL certificates must continue to work exactly as before
- Deezer API calls for track metadata must continue to function correctly
- Existing Vite proxy configuration for `/api` routes must remain unchanged
- Backend image serving and storage functionality must remain unaffected

**Scope:**
All image requests that do NOT involve the Deezer CDN (cdn-images.dzcdn.net) should be completely unaffected by this fix. This includes:
- User-uploaded images and avatars
- Images from other music services or CDNs
- Local assets and icons
- Images served through the backend API

## Hypothesized Root Cause

Based on the bug description and analysis, the most likely issues are:

1. **SSL Certificate Authority Issue**: The Deezer CDN may be using a certificate authority that is not recognized by the browser or development environment
   - Certificate may be expired or misconfigured
   - Certificate chain may be incomplete

2. **CORS and Mixed Content**: Direct requests from the frontend to the Deezer CDN may be blocked due to cross-origin restrictions combined with SSL issues

3. **Development Environment SSL Handling**: The local development server may have stricter SSL validation than production environments

4. **Certificate Pinning**: The browser may be enforcing certificate pinning policies that conflict with the Deezer CDN's current certificate

## Correctness Properties

Property 1: Bug Condition - Image Loading Success

_For any_ image request where the bug condition holds (isBugCondition returns true), the fixed system SHALL successfully load and display the album cover image through the proxy configuration, eliminating SSL certificate validation errors.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Non-Deezer Image Loading

_For any_ image request where the bug condition does NOT hold (isBugCondition returns false), the fixed system SHALL produce exactly the same result as the original system, preserving all existing image loading functionality for non-Deezer domains.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

The fix implements a Vite proxy configuration that intercepts requests to Deezer CDN images and routes them through the development server, bypassing SSL certificate validation.

**File**: `web/vite.config.ts`

**Function**: Vite proxy configuration

**Specific Changes**:
1. **Proxy Route Configuration**: Add a proxy rule that matches requests to `/cdn-images/*` and forwards them to `https://cdn-images.dzcdn.net`
   - Pattern: `'^/cdn-images'` to match the proxy path prefix
   - Target: `'https://cdn-images.dzcdn.net'` as the destination server

2. **SSL Security Bypass**: Configure `secure: false` to disable SSL certificate validation for the proxy target
   - This allows the development server to fetch images despite certificate issues
   - Only affects the server-to-server connection, not client security

3. **Origin Header Management**: Set `changeOrigin: true` to modify the Origin header for proper CORS handling
   - Ensures the Deezer CDN accepts requests from the proxy server
   - Prevents CORS-related blocking

4. **Path Rewriting**: Configure path rewriting to remove the `/cdn-images` prefix when forwarding to the target
   - `rewrite: (path) => path.replace(/^\/cdn-images/, '')` transforms `/cdn-images/images/cover/...` to `/images/cover/...`

5. **Frontend URL Updates**: Update image URL references to use the proxy path instead of direct CDN URLs
   - Transform `https://cdn-images.dzcdn.net/images/cover/...` to `/cdn-images/images/cover/...`
   - This change may be needed in components that display album covers

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Create test scenarios that attempt to load Deezer CDN images directly and through the proxy configuration. Run these tests on the UNFIXED code to observe SSL certificate failures and understand the root cause.

**Test Cases**:
1. **Direct CDN Image Load**: Attempt to load `https://cdn-images.dzcdn.net/images/cover/test/1000x1000-000000-80-0-0.jpg` directly (will fail on unfixed code)
2. **Album Cover Component Test**: Render a component with a Deezer CDN image URL (will show broken image on unfixed code)
3. **Background Image CSS Test**: Apply a Deezer CDN image as CSS background (will fail to display on unfixed code)
4. **Network Request Inspection**: Monitor browser network tab for SSL certificate errors (will show ERR_CERT_AUTHORITY_INVALID on unfixed code)

**Expected Counterexamples**:
- SSL certificate validation errors in browser console
- Possible causes: invalid certificate authority, expired certificate, CORS restrictions, certificate chain issues

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system produces the expected behavior.

**Pseudocode:**
```
FOR ALL imageRequest WHERE isBugCondition(imageRequest) DO
  result := loadImageThroughProxy(imageRequest)
  ASSERT imageLoadsSuccessfully(result)
  ASSERT noSSLErrors(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL imageRequest WHERE NOT isBugCondition(imageRequest) DO
  ASSERT loadImage_original(imageRequest) = loadImage_fixed(imageRequest)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-Deezer image requests

**Test Plan**: Observe behavior on UNFIXED code first for non-Deezer images and API calls, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Non-Deezer Image Loading**: Verify images from other domains continue to load correctly after fix
2. **API Proxy Preservation**: Verify `/api` proxy routes continue to work for backend communication
3. **Local Asset Loading**: Verify local images and assets continue to load normally
4. **User Upload Images**: Verify user-uploaded images continue to display correctly

### Unit Tests

- Test Vite proxy configuration parsing and route matching
- Test path rewriting logic for `/cdn-images` prefix removal
- Test image loading success with proxy vs direct CDN access
- Test error handling for invalid image URLs

### Property-Based Tests

- Generate random Deezer CDN URLs and verify they load successfully through proxy
- Generate random non-Deezer image URLs and verify preservation of original behavior
- Test various image formats and sizes to ensure proxy handles all cases correctly

### Integration Tests

- Test full album cover display flow from API response to rendered image
- Test lyrics panel background image loading with Deezer covers
- Test playlist and queue components with album artwork display
- Test that music interface components show actual images instead of placeholders