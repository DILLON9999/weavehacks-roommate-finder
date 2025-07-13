import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Prepare the response
  const response = NextResponse.json({ data, error });

  // Any cookies set by Supabase SSR helpers will be included automatically
  return response;
}
