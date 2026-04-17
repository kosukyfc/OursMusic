# Bugfix Requirements Document

## Introduction

The frontend (AdminPanel.tsx) and WebSocket client are making requests to `http://localhost:3000` and `ws://localhost:3000` respectively, but receiving `ERR_CONNECTION_REFUSED` errors. This happens because the frontend is built and served via XAMPP (a static file server at `C:/xampp/htdocs/music`) while the NestJS backend runs separately on port 3000. When the built frontend is accessed through XAMPP (typically on port 80 or 443), it tries to reach `localhost:3000` directly — which works only if the backend is running locally. In production/deployed builds, the `VITE_API_URL` is set to `https://oursmusics.shop/api`, but during local development the built files served by XAMPP bypass Vite's dev proxy, so direct calls to `localhost:3000` fail if the backend is not running or not reachable.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the frontend is served via XAMPP (built output) and the NestJS backend is not running on port 3000 THEN the system returns `net::ERR_CONNECTION_REFUSED` for all HTTP API calls (e.g., `POST /admin/magic-import`)

1.2 WHEN the frontend is served via XAMPP (built output) and the NestJS backend is not running on port 3000 THEN the system fails to establish a WebSocket connection to `ws://localhost:3000/socket.io/` with a connection refused error

1.3 WHEN the frontend is run via `vite dev` and the backend is not running on port 3000 THEN the system returns `ERR_CONNECTION_REFUSED` because Vite's proxy also requires the backend to be up

### Expected Behavior (Correct)

2.1 WHEN the frontend is served via XAMPP and the backend is not running locally THEN the system SHALL surface a clear, user-visible error message indicating the backend is unreachable, rather than silently failing

2.2 WHEN the frontend is served via XAMPP and the backend is not running locally THEN the WebSocket client SHALL handle the connection failure gracefully and attempt reconnection with backoff, without crashing the UI

2.3 WHEN the backend is started (`npm run start:dev` inside `backend/`) THEN the system SHALL accept connections on `0.0.0.0:3000` and the frontend served from XAMPP SHALL successfully reach it at `http://localhost:3000`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the backend is running on port 3000 and the frontend is served via Vite dev server THEN the system SHALL CONTINUE TO proxy API requests through Vite's `/api` proxy to the backend correctly

3.2 WHEN the frontend is built with `VITE_API_URL=https://oursmusics.shop/api` (production build) THEN the system SHALL CONTINUE TO route all API and WebSocket calls to the production URL, unaffected by local backend state

3.3 WHEN the backend is running and a valid JWT token is provided THEN the system SHALL CONTINUE TO authenticate and authorize admin API requests successfully

3.4 WHEN the backend is running and a WebSocket connection is established THEN the system SHALL CONTINUE TO broadcast device clock events via Socket.IO as expected
