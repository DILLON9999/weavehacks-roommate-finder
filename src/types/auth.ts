export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  // Add other user properties as needed
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateRequest {
  full_name?: string;
  avatar_url?: string;
} 