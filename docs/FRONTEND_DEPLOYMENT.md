# Frontend Deployment Guide

This document explains how to build the React frontend and configure it to communicate with the backend API.

## Environment Variables

The frontend uses Vite for builds. API settings are provided via environment variables at build time. In the GitHub Actions workflow these values are read from the Terraform state so that the deployed frontend automatically points at the current API gateway.

- `VITE_API_URL` - Base URL of the backend API (e.g. `https://api.example.com/api/v1`).
- `VITE_API_KEY` - API key for authenticated requests. Optional if your API does not require a key.

When building locally you can create a `.env` file or export these variables manually. They can be obtained from Terraform using `terraform output`:

```bash
VITE_API_URL=$(terraform output -raw api_gateway_url) \
VITE_API_KEY=$(terraform output -raw api_gateway_key 2>/dev/null || echo '') \
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
