import { NextResponse } from 'next/server';

import { OpenFMVAgentId } from '@/app/_types';
import { testOpenFMVAiAgentOnServer } from '@/app/_utils/aiAgentRuntime';

export async function POST(_request: Request, { params }: { params: { id: OpenFMVAgentId } }) {
  return NextResponse.json(await testOpenFMVAiAgentOnServer(params.id));
}
