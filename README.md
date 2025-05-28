# Printful-Webflow Sync Utility

A Next.js application that syncs Printful products to Webflow ecommerce collections using OAuth authentication.

## Features

- **Simple OAuth Integration**: Direct OAuth flows for Webflow and Printful APIs
- **Clerk Authentication**: Reliable session management without complex auth library overhead
- **Token Management**: Secure token storage using Clerk's user metadata
- **Product Sync**: Sync Printful products to Webflow ecommerce collections
- **Edge Runtime Compatible**: Works with Next.js, OpenNext, and Cloudflare Workers

## Architecture

This app uses a simplified authentication approach:

- **Clerk** for user session management (no user credentials stored)
- **Direct OAuth flows** for Webflow and Printful API authorization
- **Token storage** in Clerk's user metadata
- **No complex auth library dependencies** - just clean OAuth implementation

## Setup

### 1. Environment Variables

Create a `.env.local` file with:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Webflow OAuth
WEBFLOW_CLIENT_ID=your_webflow_client_id
WEBFLOW_CLIENT_SECRET=your_webflow_client_secret
WEBFLOW_REDIRECT_URI=your_domain.com/api/auth/webflow/callback

# Printful OAuth
PRINTFUL_CLIENT_ID=your_printful_client_id
PRINTFUL_CLIENT_SECRET=your_printful_client_secret

# Base URL for OAuth redirects
NEXTAUTH_URL=http://localhost:3000
```

### 2. Clerk Setup

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your publishable and secret keys to `.env.local`
4. Configure allowed redirect URLs in Clerk dashboard

### 3. OAuth App Setup

#### Webflow

1. Create a Webflow app at [webflow.com/developers](https://webflow.com/developers)
2. Set redirect URI to: `your_domain.com/api/auth/webflow/callback`
3. Request scopes: `sites:read ecommerce:read ecommerce:write authorized_user:read cms:read cms:write`

#### Printful

1. Create a Printful app at [printful.com/oauth](https://printful.com/oauth)
2. Set redirect URI to: `your_domain.com/api/auth/printful/callback`

### 4. Install and Run

```bash
npm install
npm run dev
```

## How It Works

### Authentication Flow

1. **User signs in** via Clerk (no credentials stored in your app)
2. **OAuth authorization** for Webflow and Printful APIs
3. **Token storage** in Clerk's user metadata
4. **API calls** use stored tokens for authorization

### Key Components

- `src/lib/auth/oauth.ts` - Direct OAuth implementation
- `src/lib/auth/clerk-oauth.ts` - Clerk integration for token management
- `src/components/auth/OAuthManager.tsx` - UI for OAuth connections
- `src/app/api/auth/*/callback/route.ts` - OAuth callback handlers

### Benefits of This Approach

- **No complex auth library** - just clean OAuth flows
- **Reliable session management** via Clerk
- **Edge runtime compatible** - works with Cloudflare Workers
- **Easy to understand** - clear separation of concerns
- **Open source friendly** - familiar patterns for contributors

## Deployment

This app is designed to work with:

- **Vercel** (standard Next.js deployment)
- **Cloudflare Workers** (via OpenNext)
- **Any edge runtime** that supports Next.js

## Contributing

This project uses a simplified auth approach that's easy to understand and contribute to. The OAuth flows are implemented directly without complex auth library abstractions, making the codebase more maintainable and debuggable.

## License

MIT
