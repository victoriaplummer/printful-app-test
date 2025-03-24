# Printful OAuth App

This is a Next.js application that demonstrates OAuth authentication with Printful's API. It allows users to sign in with their Printful account and access their store data.

## Features

- OAuth 2.0 authentication with Printful
- Session management with NextAuth.js
- TypeScript support
- Tailwind CSS for styling

## Prerequisites

- Node.js 18.18.0 or later
- npm or yarn
- A Printful account and API credentials

## Getting Started

1. Clone the repository:

```bash
git clone <your-repo-url>
cd printful-app-test
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your-generated-secret>
PRINTFUL_CLIENT_ID=<your-client-id>
PRINTFUL_CLIENT_SECRET=<your-client-secret>
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploying to Vercel

1. Create a new project on Vercel
2. Connect your repository
3. Add the following environment variables in your Vercel project settings:
   - `NEXTAUTH_URL` (your production URL)
   - `NEXTAUTH_SECRET` (your generated secret)
   - `PRINTFUL_CLIENT_ID`
   - `PRINTFUL_CLIENT_SECRET`
4. Deploy!

## Environment Variables

- `NEXTAUTH_URL`: The base URL of your application
- `NEXTAUTH_SECRET`: A secret key for NextAuth.js session encryption
- `PRINTFUL_CLIENT_ID`: Your Printful OAuth client ID
- `PRINTFUL_CLIENT_SECRET`: Your Printful OAuth client secret

## License

MIT
