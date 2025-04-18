import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Disable caching

export async function GET() {
  // Check environment variables directly from both Node.js and
  // from environments that might have different process variable access
  const envVars = {
    // Direct process.env access
    node: {
      env: process.env.NODE_ENV,
      hasEnv: typeof process !== 'undefined' && !!process.env,
      hasSbUrl: typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string',
      sbUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      sbUrlStart: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 8) || '',
      hasSbKey: typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'string', 
      sbKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      sbKeyStart: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 6) || '',
      nextConfigAvailable: process.env.NEXT_CONFIG_AVAILABLE === 'true',
      publicVarCount: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')).length,
      allVarCount: Object.keys(process.env).length
    },
    // List of specific NEXT_PUBLIC_ environment variables
    nextPublicVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .map(key => ({ 
        name: key, 
        exists: true,
        length: process.env[key]?.length || 0
      }))
  };

  return NextResponse.json({
    success: true,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    envVars
  });
} 