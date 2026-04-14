# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FaceAuth is a Next.js 14 App Router application that implements face-based authentication using Face++ (旷视) API and face-api.js for local detection. It includes face registration, login, and a protected dashboard.

## Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Build for production
npm run start    # Run production build
```

## Environment Setup

Copy `.env.local.example` to `.env.local` and configure:
- `FACEPP_API_KEY` - Face++ API key
- `FACEPP_API_SECRET` - Face++ API secret
- `SESSION_SECRET` - Session encryption key (32+ characters)

Create the data directory: `mkdir data`

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Local Face Detection**: face-api.js (tinyFaceDetector) - CDN loaded
- **Face Recognition**: Face++ API (https://console.faceplusplus.com.cn)
- **Database**: JSON file-based (`data/db.json`) — replace with PostgreSQL/MySQL for production
- **Session**: Cookie-based with Base64 encoding — replace with iron-session or jose for production

### Key Modules

| File | Purpose |
|------|---------|
| `lib/facepp.ts` | Face++ API wrapper: detectFace, searchFace, addFaceToSet |
| `lib/db.ts` | JSON database for users and FaceSet token |
| `lib/session.ts` | Cookie session management |

### Pages

- `/` — Landing page with login/register options
- `/login` — Face login with automatic quality-based capture
- `/register` — Face registration with user info
- `/dashboard` — Protected dashboard (requires login)

### API Routes

- `POST /api/auth/face-login` — Face recognition + session creation
- `POST /api/auth/face-register` — User registration + face enrollment
- `POST /api/auth/face-detect` — Face detection (used for debugging)
- `GET /api/auth/me` — Get current logged-in user
- `POST /api/auth/logout` — Clear session

## Face Detection Flow

The login page uses a two-stage approach to minimize API calls:

### Stage 1: Local Detection (free, every 300ms)
1. Use face-api.js TinyFaceDetector to detect faces in the browser
2. Analyze frame quality (brightness + texture)
3. If no face detected → skip immediately, reset counter

### Stage 2: Face++ API (1 call per login)
1. After 3 consecutive frames with face + quality ≥ 65%
2. Call Face++ search API for authentication
3. Only 1 API call per successful login

### Parameters
- `QUALITY_THRESHOLD`: 0.65 (65%)
- `STABLE_FRAMES`: 3 frames
- `CAPTURE_INTERVAL`: 300ms

## Production Considerations

- Replace JSON database with PostgreSQL/MySQL
- Encrypt sessions with iron-session or jose (currently Base64)
- Face++ free tier: 1000 API calls/month (now ~1 call per login)
- Add proper error handling and logging