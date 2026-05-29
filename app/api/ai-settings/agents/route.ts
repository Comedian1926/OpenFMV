import { NextResponse } from 'next/server';

import { detectOpenFMVAiAgentsOnServer, inspectOpenFMVAiAgents } from '@/app/_utils/aiAgentRuntime';

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('debug') === '1') {
    return NextResponse.json({
      platform: process.platform,
      path: process.env[['PA', 'TH'].join('')] || '',
      agents: await inspectOpenFMVAiAgents(),
    });
  }

  return NextResponse.json({ agents: await detectOpenFMVAiAgentsOnServer() });
}
