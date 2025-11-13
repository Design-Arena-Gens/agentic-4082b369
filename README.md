# Email Automation Taskforce

Agentic web interface that generates polished emails with Gemini and sends them automatically through your SMTP provider.

## Prerequisites

- Node.js 18+ (Next.js requirement)
- Gemini API key
- SMTP credentials (Gmail, Outlook, SendGrid, etc.)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Duplicate `.env.example` to `.env.local` and fill in all required values.
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000` to use the agent.

## Deployment

This project is ready for Vercel. Ensure environment variables are configured in your Vercel project before deploying.
