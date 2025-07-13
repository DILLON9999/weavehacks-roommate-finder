This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## App Structure

- **Home Page (/)**: Redirects authenticated users to `/places`
- **Places Page (/places)**: Main application with map-based listing filtering
- **Authentication Page (/auth)**: Login and signup
- **Settings Page (/settings)**: User profile management

## Map-Based Filtering

The `/places` page features advanced map-based filtering where:
- Only listings within the current map viewport are shown
- Moving or zooming the map automatically updates the visible listings
- Traditional filters (search, price, beds/baths) work alongside map filtering
- Real-time results counter shows listings in current view

## AI Search Assistant

The app features an AI-powered search assistant that helps users find rooms and roommates:
- Access via the search bar in the header or press `Cmd+K` (or `Ctrl+K` on Windows/Linux)
- Powered by OpenAI's GPT-4 model
- Provides personalized recommendations and answers questions about room finding
- Chat interface with message history
- Contextual responses tailored to the roommate finding platform

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
