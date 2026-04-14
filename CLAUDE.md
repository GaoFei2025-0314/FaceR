# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FaceAuth is a Next.js 14 App Router application that implements face-based authentication using Face++ (旷视) API. It includes face registration, login, and a protected dashboard.

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
- `GET /api/auth/me` — Get current logged-in user
- `POST /api/auth/logout` — Clear session

## Face Detection Logic

The login page implements automatic capture without user interaction:
1. Analyze each frame for brightness and texture (quality score 0-1)
2. When quality ≥ 65%, increment stable frame counter
3. After 6 consecutive high-quality frames (~1.8s), auto-capture and upload
4. Face++ returns confidence score; must exceed 1e-5 threshold (~73.975) for login

## Production Considerations

- Replace JSON database with PostgreSQL/MySQL
- Encrypt sessions with iron-session or jose (currently Base64)
- Face++ free tier: 1000 API calls/month
- Add proper error handling and logging