# Frontend Deployment Guide

This document explains how to build the React frontend and configure it to communicate with the backend API.

## Environment Variables

The frontend uses Vite for builds. API settings are provided via environment variables at build time:

- `VITE_API_URL` - Base URL of the backend API (e.g. `https://api.example.com/api/v1`).
- `VITE_API_KEY` - API key for authenticated requests. Optional if your API does not require a key.

Create a `.env` file or export these variables when running `npm run build`:

```bash
VITE_API_URL=https://api.example.com/api/v1 \
VITE_API_KEY=your-api-key \
npm run build
```

You can use the provided `.env.example` file as a starting point.

## Build

Run the following commands from the `frontend` directory:

```bash
npm install
npm run build
```

The compiled site will be output to the `build` directory.
