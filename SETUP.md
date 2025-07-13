# Roommate Finder Setup

## Environment Variables

Create a `.env.local` file in the root directory with the following:

```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

## Getting a Mapbox Token

1. Go to [Mapbox](https://www.mapbox.com/)
2. Sign up for a free account
3. Navigate to your account dashboard
4. Copy your default public token
5. Paste it in the `.env.local` file

## Setting up Supabase

1. Go to [Supabase](https://supabase.com/) and create a new project
2. Once your project is created, go to Settings → API
3. Copy the Project URL and add it as `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the anon/public key and add it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Setting up OpenAI API

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys in your dashboard
4. Create a new API key
5. Copy the key and add it as `OPENAI_API_KEY` in your `.env.local` file

## Database Setup

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `database/schema.sql` and run it in the SQL Editor
3. This will create the `profiles` table and set up Row Level Security (RLS)

## Running the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000` 