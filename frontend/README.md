# Ambangeg frontend

This is a statically exported Next.js application. Authentication stays on AWS through Amazon Cognito; Google is used only as the federated identity provider.

The app includes an interactive mountain directory, a mobile map/list overlay, hiking guides for Pulag, Apo and Guiting-Guiting, personalized bag tags and a My Climbs gallery. Desktop and mobile screenshots are in the [project README](../README.md).

## Mountain guides

Published guides are defined in `data/mountain-guides.ts` and rendered by `app/mountains/[slug]/page.tsx`. `generateStaticParams` exports only those guides, using profile facts from `data/mountains.ts`. Each page includes its own metadata, canonical URL, breadcrumb structured data and source references.

- `/mountains/mount-pulag/`
- `/mountains/mount-apo/`
- `/mountains/mount-guiting-guiting/`

The mountain directory links to these guides from its introduction, map results and prominent cards. Card selection continues to focus the map; the guide link opens the full page. Canonical guide URLs use `https://ambangeg.com`; update `siteUrl` in the guide page if the production domain changes.

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

## Contact form email setup

The contact form posts to an Amazon API Gateway HTTP API. A Lambda function validates the request and sends the message through Amazon SES; AWS credentials are never exposed to the browser.

1. Verify `ambangeg.com` (or the exact sender email address) in Amazon SES in your deployment region. If the SES account is still in the sandbox, also verify the destination address.
2. Create a Cloudflare Turnstile widget for the production hostname. Keep its secret key private and copy its public site key into `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the frontend build environment.
3. Install the AWS SAM CLI, authenticate the AWS CLI, and deploy from `frontend/infra/contact-form`:

   ```bash
   sam build
   sam deploy --guided
   ```

4. During the guided deployment, set `TurnstileSecretKey` to the widget's secret key. Set `AllowedOrigins` to the comma-separated site origins that may call the API (for example `https://ambangeg.com,https://www.ambangeg.com`). Do not include a trailing slash.
5. If the SES sending identity has a default configuration set, enter its name for `ConfigurationSetName`; otherwise leave that parameter blank.
6. Copy the deployment's `ContactApiUrl` output into `NEXT_PUBLIC_CONTACT_API_URL` in the frontend build environment, then rebuild and deploy the static site.

Cloudflare Turnstile is enforced by the Lambda before any email is sent. API Gateway throttling and the honeypot field remain as additional layers; requests fail closed if Turnstile cannot be verified.

## Map assets on S3 / CloudFront

Deploy the full `out/` directory produced by `npm run build`, including
`maplibre/`. The build prepares the MapLibre module worker and shared module
with `.js` extensions so S3 upload tools infer a JavaScript content type.
Both files must be served as `application/javascript` or `text/javascript`;
`text/plain` prevents browsers from loading the map.

After uploading a new build, invalidate the CloudFront cache for the updated
site files (including `/maplibre/*`). Verify the response headers for
`/maplibre/maplibre-gl-worker.js` and `/maplibre/maplibre-gl-shared.js`.

### Fix page refreshes on CloudFront

With an S3 REST origin, CloudFront's default root object only handles `/`.
The exported `/mountains/` page is stored as `mountains/index.html`, so
requesting `/mountains/` directly can return S3's XML `AccessDenied` response.

1. Open **CloudFront > Functions** and create a function using runtime
   **cloudfront-js-2.0**.
2. Paste the code from `infra/cloudfront/directory-index.js`, save, and publish.
3. In the site's distribution, edit the **default behavior**. Under
   **Function associations**, associate this CloudFront Function with
   **Viewer request**, then save. If a viewer request function already exists,
   incorporate the rewrite into it instead of replacing its other logic.
4. Wait for the distribution to deploy, then invalidate `/*` and verify a
   direct visit and refresh on `/mountains/` and `/my-climbs/`.

This rewrites page requests to their own exported `index.html` and preserves
asset paths and query strings. Keep the S3 bucket private.

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

This project uses `next/font` to load Geist for body text, Manrope for headings and map labels, and Caveat for handwritten accents.

## Refresh screenshots

Build the static export, serve `out/` at `http://127.0.0.1:4173`, and run `node scripts/capture-screenshots.cjs` with Playwright available and Chrome installed. An optional first argument specifies the Playwright module path; `SCREENSHOT_ORIGIN` overrides the server URL. The script updates desktop and mobile previews in `../docs/screenshots` and checks map counts, mobile area previews and shared map coordinates.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
