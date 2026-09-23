# Ambangeg frontend

This is a statically exported Next.js application. Authentication stays on AWS through Amazon Cognito; Google is used only as the federated identity provider.

## Google sign-in setup

1. In Amazon Cognito, create a user pool and an app client **without a client secret** (this is a browser app).
2. Add a Cognito managed-login domain and configure the app client with authorization-code grant, `openid`, `email`, and `profile` scopes.
3. Add the local and production app origins as both callback and sign-out URLs, including the trailing slash (for example `http://localhost:3000/`).
4. In Google Cloud Console, configure the OAuth consent screen (Google Auth Platform > Branding, Audience, and Data Access). Request only `openid`, `email`, and `profile`.
5. Create an OAuth 2.0 Client ID with application type **Web application**.
6. In that Google client, add the Cognito domain as an authorized JavaScript origin: `https://YOUR_COGNITO_DOMAIN`.
7. Add `https://YOUR_COGNITO_DOMAIN/oauth2/idpresponse` as the authorized redirect URI.
8. Back in Cognito, add Google as a social identity provider using Google's client ID and client secret, map `email` and `name`, and enable Google on the app client's managed-login configuration.
9. Copy `.env.example` to `.env.local` and add the Cognito pool ID, public app-client ID, domain, and local app URL. Add the same variables to the AWS hosting build environment with the production app URL.

The Google client secret belongs only in Cognito's identity-provider configuration. Never place it in a `NEXT_PUBLIC_` variable or commit it to this repository.

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
