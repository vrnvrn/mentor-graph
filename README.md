# MentorGraph
Early groundwork for p2p mentorship built on Arkiv. More once the basics are alive. 🌱

We are tracking our developer experience with Arkiv in our [runbook](./docs/development/runbook.md).

# Overview
MentorGraph is an on-chain, p2p mentorship and trust-graph layer built on Arkiv.
Users create a wallet-owned profile, publish Asks (what they want help with) and Offers (how they can help), explore a dynamic network graph to discover aligned mentors, mentees, and collaborators, and request meetings with each other for learning sessions.
Arkiv is the core data layer: profiles, asks, offers, and graph edges are stored as Arkiv entities. The app demonstrates how Arkiv can power real-time, low-cost, composable social data graphs.

# Live Demo
You can test our live demo at http://mentor-graph.vercel.app

# Arkiv
## Why Arkiv
As our data layer, Arkiv allows us to build trustless, permissionless, and serverless tools from day 1.
We aim to build p2p tools for mentorship, knowledge exchange, learning, and growth without reliance on intermediaries. Arkiv's current capabilities already enable a plethora of necessary functions for these tools, and we were able to implement an initial working MVP of a p2p mentorship platform building entirely on Arkiv for this hackathon.

## Features
### CRUD
- Store and update mentor/mentee profiles
- Create Asks & Offers as separate Arkiv entities
- Track relational edges between users (e.g., “hasSkill”, “wantsHelpWith”)
### Queries
- Graph explorer filters based on skill tags, availability, location, ask/offer type
- Cross-entity filtering to match mentors/mentees
- Querying profiles + asks/offers in a single flow
### Booking & Sessions
- Request meetings with other users from the network graph
- Two-way confirmation system (both mentor and learner must confirm)
- Automatic Jitsi video call link generation upon confirmation
- Session status tracking (pending, scheduled, in-progress, completed, cancelled)
- Sessions expire automatically after session end time
- Upcoming meetings displayed on dashboard
### Subscriptions (WIP)
- Live updates when new Asks/Offers are posted
- Real-time graph exploration without refresh
- TTL-aware UX
- Asks/Offers can expire
- UI hints when TTL is about to expire

## Notes
The mentorship graph is stored directly in Arkiv, not in local state.
The UI is built around querying Arkiv as a dynamic knowledge graph.
The developer experience report in [runbook.md](./docs/development/runbook.md) documents the friction points, RPC issues, ergonomics of the SDK, and areas where Arkiv can improve.

# Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Arkiv SDK** - Decentralized entity storage
- **React 19** - UI library

# Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```
ARKIV_PRIVATE_KEY=0x...
ARKIV_RPC_URL=https://mendoza.hoodi.arkiv.network/rpc
ARKIV_WS_URL=wss://mendoza.hoodi.arkiv.network/ws
JITSI_BASE_URL=https://meet.jit.si
```

3. Run development server:
```bash
npm run dev
```

4. Open http://localhost:3000

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run seed` - Seed dummy data
- `npm run seed:simple` - Seed simple asks/offers only

## Environment Variables

- `ARKIV_PRIVATE_KEY` (required) - Private key for server-side operations
- `ARKIV_RPC_URL` (optional) - Arkiv RPC endpoint, defaults to Mendoza testnet
- `ARKIV_WS_URL` (optional) - Arkiv WebSocket endpoint, defaults to Mendoza testnet
- `JITSI_BASE_URL` (optional) - Jitsi base URL, defaults to meet.jit.si

## Architecture

- `pages/` - Next.js pages and API routes
- `src/arkiv/` - Arkiv entity helpers (profiles, asks, offers, sessions, feedback, trustEdges)
- `src/config.ts` - Environment configuration
- `src/wallet.ts` - Wallet connection utilities
- `src/lib/jitsi.ts` - Jitsi meeting generation
- `docs/` - Documentation (guides, architecture, development notes)
- `examples/basic/` - Basic Arkiv usage examples

## Deployment

### Vercel

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `ARKIV_PRIVATE_KEY` (required)
   - `ARKIV_RPC_URL` (optional)
   - `ARKIV_WS_URL` (optional)
   - `JITSI_BASE_URL` (optional)
3. Deploy automatically on push to main branch

### Troubleshooting Deployment

If updates don't appear after deployment:

1. **Force redeploy** - Vercel dashboard → Deployments → Redeploy (disable build cache)
2. **Clear build cache** - Settings → Clear Build Cache → Redeploy
3. **Check build logs** - Verify build completed successfully
4. **Verify environment variables** - Ensure all required vars are set
5. **Hard refresh browser** - `Cmd+Shift+R` or `Ctrl+Shift+R`
6. **Check branch** - Verify correct branch is deployed

See [troubleshooting guide](./docs/development/troubleshooting.md) for detailed troubleshooting steps.
