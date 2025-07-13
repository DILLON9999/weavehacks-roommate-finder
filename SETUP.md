# Roommate Finder Setup

## Environment Variables

Create a `.env.local` file in the root directory with the following:

```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

## Getting a Mapbox Token

1. Go to [Mapbox](https://www.mapbox.com/)
2. Sign up for a free account
3. Navigate to your account dashboard
4. Copy your default public token
5. Paste it in the `.env.local` file

## Running the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000` 