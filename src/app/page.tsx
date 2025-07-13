'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/utils/supabase/client';
import Header from '@/components/Header';

export default function Home() {
  const router = useRouter();

  // Check authentication and redirect to places page
  useEffect(() => {
    const supabase = createClient();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push('/auth');
      } else {
        router.push('/places');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push('/auth');
      } else {
        router.push('/places');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Show loading screen while checking authentication
  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    </div>
  );
}
