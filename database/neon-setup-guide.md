# Ambangeg: Neon PostgreSQL + Prisma

This is the active database setup. Neon hosts PostgreSQL; Prisma is the backend database client. The frontend remains a static Next.js app. The deployed API uses AWS Lambda and API Gateway, with Cognito for authentication and S3 for photos. No RDS instance, EC2 instance or database VPC is required for this path.

## 1. Add the two private connection strings

Your Neon project already exists. Open **Connect** and select the branch, database and role you intend to initialize.

1. Enable **Connection pooling**, copy the complete connection string and place it in `database/.env` as `DATABASE_URL`.
2. Disable **Connection pooling**, copy the complete string for the same branch/database/role and add it as `DIRECT_URL`.
3. Keep Neon's TLS parameters, including `sslmode=require`, as supplied. Preserve any other parameters shown by Neon.

```dotenv
DATABASE_URL="YOUR_FULL_POOLED_NEON_URL"
DIRECT_URL="YOUR_FULL_DIRECT_NEON_URL"
```

The key is `DIRECT_URL`, with an underscore. The pooled hostname normally contains `-pooler`; the direct hostname does not. Do not paste these values into chat or add them to a `NEXT_PUBLIC_` variable. `database/.env` is ignored by Git. Nothing in the frontend imports the database package.

The CLI uses `DIRECT_URL`; the backend client uses `DATABASE_URL`. [Prisma PostgreSQL connection guidance](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql).

## 2. Install and validate locally

Open PowerShell on your computer:

```powershell
Set-Location D:\dev\bundok-app\database
npm install
npm run validate
npm run generate
npm run typecheck
```

Use Node.js 22.12 or newer on the Node 22 line. The package deliberately pins Prisma CLI, client and adapter to **7.10.0**. Unqualified latest Prisma currently selects a Prisma 8 release candidate with a different setup; do not replace these versions with latest. [Prisma release status](https://www.prisma.io/docs/orm).

These checks generate the client locally and do not create database tables.

## 3. Initialize a new, empty Neon database

First confirm the URL targets the intended Neon branch. A development branch is useful for testing before a production deployment. The migration creates a separate PostgreSQL schema named `ambangeg` inside the database from your URL; you do not need to rename Neon's default `neondb` database.

From the same `database` directory:

```powershell
npm run db:status
npm run db:migrate
npm run db:seed
npm run db:check
```

Before initialization, `db:status` can report the initial migration is pending and exit nonzero; that is expected for a new database. Connection/authentication errors must be resolved first.

`db:migrate` applies the checked-in initial Prisma migration. It includes the SQL constraints, cover-photo index and update triggers from the original schema. `db:seed` imports the current mountain/trail catalogue while preserving existing IDs on repeated runs. `db:check` tests schema integrity in a rolled-back transaction and verifies queries through the pooled Prisma client. For the current catalogue, expect 2,022 mountains and 134 trails; counts can change when the catalogue changes.

If you already ran `migrations/001_initial.sql` manually against this Neon database, stop before `db:migrate`. The schema must be reviewed and baselined into Prisma migration history first. Do not run two initializations against the same tables. Do not use `prisma db push` or reset as substitutes for this migration.

In Neon SQL Editor, inspect tables under the `ambangeg` schema, not just `public`.

## 4. Prepare the AWS backend settings

**Steps 1–3 have already been completed for this project.** The Neon tables exist, the catalogue has been imported, and Prisma can query the database. You do not need to initialize it again.

**The climbs API is built and deployed to Lambda and API Gateway.** The deployed API rejects unsigned requests with HTTP 401. Signed-in testing and frontend integration remain. The existing contact-form Lambda handles email only.

```text
Website -> API Gateway -> Lambda -> Prisma -> Neon PostgreSQL
```

Steps 4.1–4.4 are complete, and the stack in 4.5 is deployed. Continue with signed-in API testing at the end of 4.5, then frontend integration in 4.6.

### 4.1. Find your existing Cognito sign-in settings — do this now

1. Open the AWS console and select the region used by your existing Cognito user pool. The project examples use Sydney (`ap-southeast-2`).
2. Search for **Cognito** and open **User pools**.
3. Select the pool already used by Ambangeg. Do not create another pool for this setup.
4. Record its **User pool ID**. It looks like `ap-southeast-2_ABC123`.
5. Open **App clients** under the pool's application settings. Select the existing browser app client and record its **Client ID**. You need the ID, not a client secret.
6. Record your frontend origins: `https://ambangeg.com`, `https://www.ambangeg.com` if you serve it, and `http://localhost:3000` for development. Origins have no trailing slash.

You can also find the two public IDs already configured in the frontend's environment files: `NEXT_PUBLIC_COGNITO_USER_POOL_ID` and `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID`. These are identifiers, unlike the private Neon URLs.

**Checkpoint:** you have the AWS region, user pool ID, app client ID and allowed site origins. These become parameters in the future API deployment template.

### 4.2. Confirm the database settings — do this now

1. Keep both connection strings in `database/.env`.
2. Confirm `DATABASE_URL` is the pooled Neon URL. This is the URL the backend needs.
3. Keep `DIRECT_URL` for migrations and administration. It will not be copied into the frontend or the Lambda runtime.
4. Keep the existing `.env` private. You do not need to move it again.

**Checkpoint:** the URLs are already configured and tested. No database changes are needed for this step.

### 4.3. API implementation ? completed

The API implementation is in `database/src/handler.ts`, with routing/validation in `src/api.ts` and Prisma queries in `src/store.ts`. The deployment template is `infra/climbs-api.template.json`.

It supports:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/me` | Get or initialize the signed-in hiker profile |
| PATCH | `/me` | Update the display name |
| GET | `/me/climbs` | List this user's climbs; `page=0&limit=50` by default, maximum limit 100 |
| POST | `/me/climbs` | Add a climb |
| GET / PATCH / DELETE | `/me/climbs/{id}` | Read, edit or delete an owned climb |
| PUT | `/me/climbs/pins` | Replace pins using `{ "climbIds": ["UUID"] }`, at most three |

A create body uses `slug`, `climbedOn` (YYYY-MM-DD), optional `finishedOn`, `notes`, `summitNotReached`, `visibility` and `trailId`. Ownership is derived from verified Cognito access-token claims. Climb create/update bodies do not accept a client-supplied user ID, pin slot, photo data or database URL. Photo data is accepted only by the separate photo route. Profile updates accept only `displayName`.

TypeScript checks, authentication/validation tests, real Neon ownership/CRUD tests and the standalone Lambda bundle test have passed. SAM template validation passed. Signature validation happens in the deployed API Gateway JWT authorizer; local tests cover the handler's rejection of missing or inappropriate authorizer claims. Live AWS JWT/CORS checks still need to run after deployment.

To rebuild or rerun local checks from the database directory:

```powershell
npm run typecheck
npm test
npm run api:build
sam validate --lint --template-file infra/climbs-api.template.json --region ap-southeast-2
```

The build produces `dist/handler.mjs`, including the generated Prisma client and runtime dependencies. It does not include either `.env` file. The template points at this prebuilt directory, so a separate `sam build` is not needed for this workflow.

### 4.4. Publish the prepared runtime credential to Parameter Store

**The restricted `ambangeg_app` database login has already been created and verified.** Its pooled URL is in **`database/.env.runtime`**, which is ignored by Git. Keep `database/.env` unchanged: its owner credentials are still used for migrations. Do not run `npm run api:role` again unless deliberately setting up a separate new database.

The application login can read mountains/trails and access profile/climb/photo records. It cannot write the mountain catalogue or create objects in the `ambangeg` schema. Per-user authorization remains the API's responsibility.

**Completed:** Standard SecureString **`/ambangeg/dev/DATABASE_URL`** in **Sydney (`ap-southeast-2`)** now contains the restricted application connection string, encrypted using **`alias/aws/ssm`**. After your approval, the value was published and verified against `.env.runtime`; the login is `ambangeg_app`. No connection string was printed.

The command below is retained for future credential updates. Step 4.4 is already complete; you do not need to run it again. Publishing replaces any existing value at this parameter name:

```powershell
Set-Location D:\dev\bundok-app\database
aws sts get-caller-identity
$env:AWS_REGION = 'ap-southeast-2'
npm run api:parameter
```

The publishing script reads `.env.runtime` and does not print the credential. The local AWS CLI is authenticated at the time this guide was updated. If your session expires, use `aws login` and complete the browser sign-in, then verify `aws sts get-caller-identity`. [AWS CLI sign-in guidance](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html).

For a console-managed setup, the corresponding fields are:

1. Open **Systems Manager ? Parameter Store** in **Sydney**. This is the planned Lambda region; the Lambda does not exist until 4.5.
2. Create `/ambangeg/dev/DATABASE_URL`, or edit that exact parameter if it already exists.
3. Use **Standard**, **SecureString**, and **`alias/aws/ssm`**.
4. The Value is the text after `DATABASE_URL=` in **`.env.runtime`**, without the surrounding quotation marks. It uses `ambangeg_app`, not `neondb_owner`.
5. Keep the value private; confirm the parameter name and type after saving.

Standard storage and standard-throughput Parameter Store requests have no additional charge. KMS usage beyond its shared free allowance can incur charges. Keep higher throughput disabled for this initial setup. [Parameter Store pricing](https://aws.amazon.com/systems-manager/pricing/), [KMS pricing](https://aws.amazon.com/kms/pricing/).

The Lambda code retrieves this SecureString using `GetParameter` with decryption, caches it across warm invocations, and supplies it to Prisma. Its role can read only this parameter. The default `aws/ssm` key supplies account-level decryption permission; use a dedicated key/policy if stricter key isolation is needed later. Password changes require updating the parameter and recycling warm Lambda environments to load the new credential.

**Checkpoint:** the encrypted parameter contains the restricted application URL. This step is complete.

### 4.5. Deploy Lambda and API Gateway

**Deployment completed:** `ambangeg-climbs-dev` in Sydney reports `UPDATE_COMPLETE`, including the photo feature update. Its API base URL is `https://2x47fd2ckf.execute-api.ap-southeast-2.amazonaws.com`. An unsigned request to `/me/climbs` returned HTTP **401**, as expected. The user confirmed signed-in climb saving works against the deployed API. The deployment commands below are retained as reference; do not repeat the initial deployment.

Run this only after the encrypted parameter has been published and the Cognito IDs from 4.1 are confirmed. This creates AWS resources and can incur Lambda, API Gateway, S3 deployment-artifact and log charges under your account's pricing/allowances.

In **local PowerShell**, from `D:\dev\bundok-app\database`, run:

```powershell
npm run api:build
sam deploy --guided --template-file infra/climbs-api.template.json --stack-name ambangeg-climbs-dev --region ap-southeast-2 --resolve-s3 --capabilities CAPABILITY_IAM
```

SAM packages the prebuilt bundle, uploads it to its deployment bucket and submits the CloudFormation stack. The stack creates Lambda, API Gateway, the scoped execution role and a 14-day log group. It creates **no EC2 instance, RDS database or VPC**. [AWS SAM guided deployment](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/deploying-options.html).

Use these values when prompted:

| Prompt | Value |
| --- | --- |
| Stack name | `ambangeg-climbs-dev` |
| AWS region | `ap-southeast-2` |
| `CognitoUserPoolId` | Existing Ambangeg pool ID from 4.1; it must be in the deployment region |
| `CognitoClientId` | Existing browser app client ID from 4.1 |
| `DatabaseParameterName` | `/ambangeg/dev/DATABASE_URL` |
| `AllowedOrigins` | `https://ambangeg.com,https://www.ambangeg.com,http://localhost:3000` (remove unused origins) |
| `ReservedConcurrency` | `0` for no reservation initially; a small positive cap can be chosen if the account quota permits |
| Confirm changes before deploy | `Y` so you can review the proposed resources |
| Allow SAM CLI IAM role creation | `Y`; the template needs a Lambda execution role |
| Disable rollback | `N` |
| Save arguments to configuration | `Y`; keep generated `samconfig.toml` local |

The API has JWT authentication on all routes. If a prompt unexpectedly claims the function/API has no authorization, check the selected template rather than accepting unauthenticated access. SAM will show the proposed change set before the final deployment confirmation.

When CloudFormation reports success, record the **`ClimbsApiUrl`** output. This is the URL you later put in frontend configuration; it is not a Neon URL.

First check that the deployed API rejects unsigned requests:

```powershell
curl.exe -i "YOUR_CLIMBS_API_URL/me/climbs"
```

Expect HTTP **401**. A 200 response without sign-in is a failed authentication check.

For authenticated testing, sign in through the existing Cognito flow and use the session's **access token**, not its ID token, in an `Authorization: Bearer ...` header. Keep tokens private. Verify a signed-in account can list/create/edit/delete its own climbs and cannot access another account's IDs. API Gateway verifies the token signature, issuer, expiry and client audience; the handler also checks token type and ownership. [AWS JWT authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html).

The template starts with route throttling at two requests per second and a burst of five. Each warm Lambda uses at most two PostgreSQL connections. Monitor Neon connections and Lambda concurrency before increasing throughput; `ReservedConcurrency=0` is not a global database-connection cap.

**Checkpoint:** the stack exists, unauthenticated requests receive 401, and signed-in requests work. The website still uses local storage until 4.6.

### 4.6. Test and publish the connected frontend

**Implemented locally:** My Climbs now uses the deployed API when signed in. Account create/edit/delete/pins, explicit import, failure recovery, account switching and sign-out preservation passed browser tests with a mock API. Signed-out users see only a sign-in screen; local and account cards are hidden, and local records remain stored for later import. The live API rejects unsigned requests and permits localhost CORS; the user has confirmed real signed-in climb saving works.

The public `NEXT_PUBLIC_CLIMBS_API_URL` is configured in `frontend/.env.local` and `frontend/.env.production.local`. No Neon URL belongs in frontend configuration.

1. Open PowerShell in `D:\dev\bundok-app\frontend`.
2. Stop your existing development server with **Ctrl+C**, then run **`npm run dev`**.
3. Open **`http://localhost:3000/my-climbs/`**. Use localhost exactly, since it is an allowed Cognito callback and API origin.
4. Sign in with Google. The journal should say it is saved to your account. Existing browser records are kept separately.
5. Add a test climb, refresh, edit it, refresh, pin it, refresh, then remove it. Confirm changes persist.
6. If you want existing local records copied into this account, choose **Import saved climbs** and confirm. Original local records/photos remain in the browser; matching account entries are skipped on repeated import, with missing photos uploaded when present locally. Choose pins again using **Pin favourites**.
7. After the live test succeeds, build from `frontend` using **`npm run build`**, then publish **`out/`** through the existing static-site deployment process. The live website still uses its old build until publication.

**Photo support is deployed and verified:** a disposable live Lambda/SSM/Neon/S3 smoke test passed upload, signed image retrieval, private bucket access, owner isolation, replacement, removal and climb-delete object cleanup. The bucket is `ambangeg-climbs-dev-climbphotosbucket-nvghbvqmb52r` in Sydney; find uploaded objects under `climbs/` in S3. Test records and objects were removed. Direct IAM-authorized Lambda invocations used synthetic identity claims; this test does not substitute for the real browser photo check.

**Using photos:** choose one JPG, PNG or WebP image up to 15 MB in the climb form. The browser prepares a small JPEG; the authenticated API checks ownership, bounds image dimensions/memory, and re-encodes pixels without input metadata before storing the file in private, encrypted S3. Neon stores its object key in `ambangeg.climb_photos`.

- `PUT /me/climbs/{id}/photo` accepts `{ "photo": "data:image/jpeg;base64,..." }` (prepared JPEG up to 240,000 characters).
- `DELETE /me/climbs/{id}/photo` removes the current photo.
- Climb GET/list responses include `photos`, containing temporary signed image URLs. The frontend renews these links on tab focus and after 45 minutes. [AWS signed image links](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).
- Replacement/removal and climb deletion queue obsolete S3 objects in `ambangeg.photo_deletions`. Cleanup runs after photo mutations and hourly. Failed deletions stay queued for retry. An unfinished upload becomes eligible after one hour; active photos are not expired by a bucket lifecycle rule.
- If climb details save but photo upload fails, the form retains the saved climb ID. Retry the photo using **Save changes**, or reload to check its state; this avoids duplicate climb creation.
- Confirmed local imports now include their saved photos. Original browser records/photos remain intact. Matching account entries with a photo already present are not overwritten.

Test on localhost: add a climb with a photo, save, refresh, edit to replace the photo, save/refresh again, remove the photo and save, then delete the test climb. Account photos should work across devices after frontend publication. The default image remains available when no photo is selected.

**Checkpoint:** after publication, a climb saved on the website appears in Neon and is available after signing in on another device.

## Current scope

This package now includes the database schema, migrations, catalogue import, restricted runtime login, tested climbs API, Lambda bundle and SAM deployment template. The AWS stack is deployed and unsigned requests return HTTP 401. Frontend integration is implemented and tested locally with a mock API. The user confirmed real signed-in climb saves. Photo testing with the real browser account and frontend publication remain; the live website still uses its previous browser-storage build. Do not follow the RDS CloudFormation guide for the Neon path. Existing RDS files are retained only as reference.

Dependency audit currently flags four high-severity entries in Prisma CLI tooling and its `deepmerge-ts`/`mysql2` dependencies. The build metadata confirms those packages and `@prisma/config` are excluded from the Lambda bundle. Keep the CLI configuration trusted; do not apply the suggested forced major-version downgrade without reviewing compatibility.
