# Setup Guide

## Quick Start

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up Clerk**:

   - Go to [clerk.com](https://clerk.com) and create an account
   - Create a new application
   - Copy your keys to `.env.local`:

   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

3. **Configure OAuth Apps**:

   ### Webflow

   - Go to [webflow.com/developers](https://webflow.com/developers)
   - Create a new app
   - Set redirect URI: `your-domain.com/cosmic/api/auth/webflow/callback`
   - Add to `.env.local`:

   ```env
   WEBFLOW_CLIENT_ID=your_client_id
   WEBFLOW_CLIENT_SECRET=your_client_secret
   WEBFLOW_REDIRECT_URI=your-domain.com/cosmic/api/auth/webflow/callback
   ```

   ### Printful

   - Go to [printful.com/oauth](https://printful.com/oauth)
   - Create a new app
   - Set redirect URI: `your-domain.com/cosmic/api/auth/printful/callback`
   - Add to `.env.local`:

   ```env
   PRINTFUL_CLIENT_ID=your_client_id
   PRINTFUL_CLIENT_SECRET=your_client_secret
   ```

4. **Base URL**:

   ```env
   NEXTAUTH_URL=http://localhost:3000
   ```

5. **Run the app**:
   ```bash
   npm run dev
   ```

## Important Notes

- **Base Path**: This app uses `/cosmic` as the base path
- **Main App**: Visit `http://localhost:3000/cosmic` (root redirects there)
- **OAuth Callbacks**: All callbacks use the `/cosmic/api/auth/` prefix
- **Clerk Configuration**: Sign-in/up URLs are configured for the cosmic path

## Environment Variables Template

Create `.env.local` with:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here

# Webflow OAuth
WEBFLOW_CLIENT_ID=your_webflow_client_id
WEBFLOW_CLIENT_SECRET=your_webflow_client_secret
WEBFLOW_REDIRECT_URI=http://localhost:3000/cosmic/api/auth/webflow/callback

# Printful OAuth
PRINTFUL_CLIENT_ID=your_printful_client_id
PRINTFUL_CLIENT_SECRET=your_printful_client_secret

# Base URL
NEXTAUTH_URL=http://localhost:3000
```

## Development vs Production

For production, update the redirect URIs to use your production domain:

- Webflow: `https://your-domain.com/cosmic/api/auth/webflow/callback`
- Printful: `https://your-domain.com/cosmic/api/auth/printful/callback`
