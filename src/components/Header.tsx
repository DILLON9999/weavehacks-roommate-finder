'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      const result = await response.json();
      
      if (response.ok && result.profile) {
        setProfile(result.profile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    
    // Clear the userid cookie
    document.cookie = 'userid=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    router.push('/auth');
  };

  const handleSettings = () => {
    setShowDropdown(false);
    router.push('/settings');
  };

  const displayName = profile?.full_name || user?.email || 'Loading...';

  return (
    <header className="bg-background border-b border-border px-6 py-4">
      <div className="mx-[3%] flex items-center justify-between relative">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-white">roomer</h1>
        </div>

        {/* Navigation - Centered */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <nav className="flex items-center gap-1">
            <button className="px-6 py-2 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors font-medium text-sm">
              Roomies
            </button>
            <button className="px-6 py-2 rounded-full bg-white text-black hover:bg-gray-100 transition-colors font-medium text-sm">
              Places
            </button>
          </nav>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <span className="text-foreground font-medium text-sm max-w-[150px] truncate">
            {displayName}
          </span>
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors overflow-hidden"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-foreground" />
              )}
            </button>
            
            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 transform -translate-x-full translate-x-10">
                <div className="p-2">
                  <div className="px-3 py-2 text-sm text-muted-foreground border-b border-border">
                    <div className="flex items-center gap-2">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profile"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-4 h-4" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs text-foreground font-medium truncate">
                          {profile?.full_name || 'No name set'}
                        </div>
                        <div className="text-xs truncate">{user?.email}</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSettings}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors mt-1"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </header>
  );
} 