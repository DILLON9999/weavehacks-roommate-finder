import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const { email, password, full_name, avatar_url } = await request.json();

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.json({ data, error });
  }

  // If signup was successful and we have a user, create their profile
  if (data.user && (full_name || avatar_url)) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: data.user.id,
        full_name: full_name || null,
        avatar_url: avatar_url || null
      });

    if (profileError) {
      console.error('Failed to create profile:', profileError);
      // Don't fail the signup if profile creation fails
    }
  }

  // Prepare the response
  const response = NextResponse.json({ data, error });

  // Ensure cookies set by Supabase are included in the response
  // (Supabase SSR helpers handle this automatically when using setAll)
  return response;
}
