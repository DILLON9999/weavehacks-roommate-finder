'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, User as UserIcon, Mail, Save, Upload, Camera } from 'lucide-react';
import Header from '@/components/Header';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  // Check authentication and load profile
  useEffect(() => {
    const supabase = createClient();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session?.user) {
        router.push('/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session?.user) {
        router.push('/auth');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Load user profile data
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      const result = await response.json();
      
      if (response.ok && result.profile) {
        setProfile(result.profile);
        setFullName(result.profile.full_name || '');
        setAvatarUrl(result.profile.avatar_url || '');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          avatar_url: avatarUrl
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage('Profile updated successfully!');
        setProfile(result.profile);
      } else {
        setMessage(`Error: ${result.error?.message || 'Failed to update profile'}`);
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render anything
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your profile information and preferences
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          {/* Current Profile Display */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-primary-foreground" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <Camera className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {fullName || 'No name set'}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                {user.email}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-foreground placeholder-muted-foreground transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="avatarUrl" className="block text-sm font-medium text-foreground mb-2">
                Profile Picture URL
              </label>
              <div className="relative">
                <input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/your-photo.jpg"
                  className="w-full px-4 py-3 pr-12 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-foreground placeholder-muted-foreground transition-all duration-200"
                />
                <Upload className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter a URL to an image you'd like to use as your profile picture
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`text-center text-sm p-3 rounded-lg ${
              message.includes('success') || message.includes('Success')
                ? 'bg-green-600 bg-opacity-20 text-green-400 border border-green-600 border-opacity-30'
                : 'bg-red-600 bg-opacity-20 text-red-400 border border-red-600 border-opacity-30'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Account Information */}
        <div className="mt-8 bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Account Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm text-foreground">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Account Created</span>
              <span className="text-sm text-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">User ID</span>
              <span className="text-sm text-foreground font-mono">{user.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 