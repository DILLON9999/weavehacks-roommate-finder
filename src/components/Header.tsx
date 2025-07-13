'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, User as UserIcon, Search } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { Listing } from '@/types/listing';
import AIChatbot from './AIChatbot';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface HeaderProps {
  onListingsUpdate?: (listings: Listing[]) => void;
}

export default function Header({ onListingsUpdate }: HeaderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowChatbot(true);
      }
      if (e.key === 'Escape' && showChatbot) {
        setShowChatbot(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showChatbot]);

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

  const handleListingsUpdate = (listings: Listing[]) => {
    if (onListingsUpdate) {
      onListingsUpdate(listings);
    }
    setShowChatbot(false); // Close chatbot after getting results
  };

  const displayName = profile?.full_name || user?.email || 'Loading...';

  return (
    <header className="bg-background border-b border-border px-6 py-4">
      <div className="mx-[3%] flex items-center justify-between relative">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-white">roomer</h1>
        </div>

        {/* AI Search Bar - Centered */}
        <div className="absolute left-1/2 transform -translate-x-1/2 w-full max-w-sm">
          <button
            onClick={() => setShowChatbot(true)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-left"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground flex-1 text-sm">Curate your search</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded text-xs text-muted-foreground">
              <span>⌘</span>
              <span>K</span>
            </div>
          </button>
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-white hidden sm:inline">
              {displayName}
            </span>
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg z-50">
              <div className="p-3 border-b border-zinc-700">
                <p className="text-sm font-medium text-white">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={handleSettings}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
      
      {/* AI Chatbot */}
      <AIChatbot
        isOpen={showChatbot}
        onClose={() => setShowChatbot(false)}
        onListingsUpdate={handleListingsUpdate}
      />
    </header>
  );
} 