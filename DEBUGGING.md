# Debugging Guide

## Profile Update 500 Error

If you're getting a 500 Internal Server Error when updating your profile, here's how to debug:

### 1. Check the Database Setup

Make sure you've run the database schema from `database/schema.sql`:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/schema.sql`
4. Run the SQL query

### 2. Check Environment Variables

Ensure your `.env.local` file has the correct Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Check Browser Console

1. Open your browser's developer tools (F12)
2. Go to the Console tab
3. Try updating your profile again
4. Look for any error messages

### 4. Check Server Logs

1. In your terminal where you're running `npm run dev`
2. Try updating your profile again
3. Look for error messages in the server logs

### 5. Verify Table Structure

In your Supabase dashboard, go to the Table Editor and verify the `profiles` table exists with these columns:

- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `full_name` (TEXT, nullable)
- `avatar_url` (TEXT, nullable)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### 6. Check RLS Policies

In your Supabase dashboard, go to Authentication → Policies and verify the following policies exist for the `profiles` table:

- "Users can view their own profile"
- "Users can insert their own profile"
- "Users can update their own profile"
- "Users can delete their own profile"

### 7. Test API Directly

You can test the API endpoint directly by opening your browser's developer tools and running:

```javascript
fetch('/api/profile', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    full_name: 'Test Name',
    avatar_url: 'https://example.com/avatar.jpg'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

Look at the response to see what error is being returned.

## Common Issues

### "relation 'profiles' does not exist"
This means the database table wasn't created. Follow step 1 above.

### "JWT expired" or "Invalid JWT"
This usually means your session has expired. Try logging out and logging back in.

### "permission denied for table profiles"
This means RLS policies aren't set up correctly. Run the database schema again.

### "duplicate key value violates unique constraint"
This can happen if you're trying to create a profile that already exists. The API should handle this with upsert, but if it doesn't, you may need to check the database manually.

## Getting Help

If you're still having issues:

1. Include the exact error message from both browser console and server logs
2. Verify you've completed all setup steps
3. Check that your Supabase project is active and not paused 