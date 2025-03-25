/**
 * This script provides instructions for setting up Redis locally
 * for development purposes.
 */

console.log(`
=====================================================
Redis Setup Guide for Development
=====================================================

To enable multi-provider authentication, this application uses Redis
to store and maintain authentication tokens across multiple sign-ins.

For local development, you have several options:

Option 1: Install Redis locally (Mac/Linux)
-------------------------------------------
# Using Homebrew on Mac:
brew install redis
brew services start redis

# On Ubuntu:
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

Option 2: Use Docker (All platforms)
-------------------------------------------
# Run Redis in a Docker container:
docker run -d -p 6379:6379 --name redis-auth redis:alpine

Option 3: Use a free Redis cloud provider
-------------------------------------------
1. Sign up for a free tier at:
   - Upstash: https://upstash.com/
   - Redis Labs: https://redis.com/try-free/

2. Get your Redis connection URL
3. Update the REDIS_URL in your .env.local file

Testing Your Redis Connection
-------------------------------------------
After setting up Redis, restart your Next.js server:
npm run dev

You should see a "Redis connected successfully" message in the console.

=====================================================
`);
