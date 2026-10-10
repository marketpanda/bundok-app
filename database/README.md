# Ambangeg database: Neon + Prisma

**Start with the [Neon step-by-step setup guide](neon-setup-guide.md).** This is the active setup after switching from RDS to Neon. Keep the private pooled `DATABASE_URL` and direct `DIRECT_URL` in `database/.env`.

The `database` package contains Prisma models, migrations, catalogue seeding and the deployed Cognito-protected climbs API. Account climbs support single mountains and verified group itineraries. Group hikes retain a snapshot of each destination and whether it was marked as reached. Photo support adds a private S3 bucket, authenticated upload/removal, temporary image links and a durable cleanup queue. Deployed checks cover group saves and edits, ownership, and photo upload/replacement/removal. Continue with frontend publication in [Step 4.6](neon-setup-guide.md#46-test-and-publish-the-connected-frontend). The frontend remains statically hosted; its build does not deploy the database or Lambda.

The earlier RDS notes below are retained as an alternative reference. **Do not deploy the RDS template when using Neon.**

---

## Archived RDS preparation

Alternative only: [RDS setup guide](rds-setup-guide.md). It covers console navigation, creating a private network, filling CloudFormation parameters, transferring SQL files and verifying initialization. The sections below are the technical reference.

This setup uses standard Amazon RDS PostgreSQL and plain SQL migrations. Prisma is not configured, and Neon is not used by this deployment path. API Gateway and Lambda are the planned serverless backend; the RDS database is a provisioned instance.

Prepared for Amazon RDS PostgreSQL using the supplied conversation and the current app. No AWS resources have been created and the frontend still uses local storage. The database files are independent of the static Next.js build.

## Recommended first deployment

Use standard RDS PostgreSQL 17, Single-AZ, db.t4g.small (2 GiB RAM), and 20 GiB gp3 storage with autoscaling capped at 100 GiB. db.t4g.micro (1 GiB) is an alternative for a small development workload and is the compatible choice for the newer AWS Free account plan; db.t4g.small requires a Paid plan. These are starting sizes, not a promise about concurrent users. Choose Multi-AZ for production availability when the budget permits. Keep RDS, the API and Cognito in the same AWS region where practical; the repo examples use ap-southeast-2, but confirm your actual existing region.

RDS has ongoing compute/storage charges when idle. Also budget for backups beyond allowances, Secrets Manager, logs, S3, API/Lambda and any proxy or VPC endpoints/NAT you add. A storage cap is not a billing cap. Check your AWS Free Tier account eligibility and create an AWS Budget alert before deployment.

## What to set up in AWS

1. Select the region and existing VPC. Supply two private subnet IDs in different availability zones, both in that VPC. A Single-AZ database still requires a subnet group spanning at least two AZs.
2. Create/select the backend security group in that VPC. The template allows PostgreSQL port 5432 only from this group. For administration, use a private CloudShell VPC environment or an SSM-managed administration host with that group; your ordinary laptop cannot directly reach a private endpoint. The administration host needs psql.
3. Choose an available PostgreSQL 17 minor version and instance class. The template requires the exact engine version instead of guessing regional availability.
4. Deploy rds.template.json through CloudFormation with VpcId, PrivateSubnetIds, ClientSecurityGroupId, EngineVersion, InstanceClass and MultiAZ. The template creates a database/subnet/parameter/security group, uses an RDS-managed admin secret, and outputs the endpoint, port and secret ARN. It does not create a VPC, API, S3 bucket or proxy.
5. Set up a private S3 bucket for hike photos, with public access blocked. Later configure narrowly scoped presigned uploads and permitted frontend origins. Store S3 object keys in PostgreSQL and generate short-lived download URLs in the API.
6. Prepare an API Gateway HTTP API with a Cognito JWT authorizer and backend Lambda in the VPC. Static Next.js/S3 hosting cannot connect directly to PostgreSQL. Backend implementation and frontend synchronization are the next phase.

Check available versions (replace the region if required):

~~~powershell
aws rds describe-db-engine-versions --engine postgres --region ap-southeast-2 --query "DBEngineVersions[?starts_with(EngineVersion, '17.')].EngineVersion" --output table
~~~

Before provisioning, validate the template and check the selected engine/class combination with describe-orderable-db-instance-options. CloudFormation's create-stack flow lets you review parameters before creation. Deletion protection is enabled; database deletion requires explicitly disabling it. CloudFormation also snapshots the database on deletion/replacement.

~~~powershell
aws cloudformation validate-template --template-body file://database/rds.template.json --region ap-southeast-2
~~~

## Initialize the database

Install Node.js locally and PostgreSQL client tools on the private administration environment. Download the official RDS CA bundle from https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem. Use the endpoint and secret ARN from CloudFormation; obtain the admin password privately in Secrets Manager.

Generate the seed from the current mountain catalogue at the repository root:

~~~powershell
node database/scripts/prepare-seed.mjs
~~~

On a machine with private database connectivity, set libpq connection variables. The example environment file documents them; psql does not automatically load .env files.

~~~powershell
$env:PGHOST = 'YOUR_RDS_ENDPOINT'
$env:PGPORT = '5432'
$env:PGDATABASE = 'ambangeg'
$env:PGUSER = 'ambangeg_admin'
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = 'C:/path/to/global-bundle.pem'
psql -W -v ON_ERROR_STOP=1 -f database/migrations/001_initial.sql
psql -W -v ON_ERROR_STOP=1 -f database/seed.sql
psql -W -v ON_ERROR_STOP=1 -f database/checks/schema.sql
~~~

The migration applies once to an empty database and is transactional. A second application fails without modifying it. The seed is repeatable, preserves existing mountain/trail IDs, and never removes catalogue entries. Regenerate it whenever the JSON catalogue changes. It preserves source credits and whether coordinates identify a jump-off. No demo climbs or user photos are imported. Seed SQL is generated locally and ignored by Git.

## Runtime credentials and authorization

Use the admin account only for migrations. Create a separate non-owner login once, then set its password interactively with psql's password command; keep its credentials in a separate Secrets Manager secret for the backend.

~~~sql
CREATE ROLE ambangeg_app LOGIN;
GRANT CONNECT ON DATABASE ambangeg TO ambangeg_app;
GRANT USAGE ON SCHEMA ambangeg TO ambangeg_app;
GRANT SELECT ON ambangeg.mountains, ambangeg.mountain_trails TO ambangeg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ambangeg.users, ambangeg.climbs, ambangeg.climb_photos TO ambangeg_app;
~~~

At the psql prompt run: \password ambangeg_app

The backend must verify Cognito tokens and derive the user from the verified issuer + sub, including federated Google users. Do not use a Google email or client-supplied user ID as the ownership authority. API Gateway authorizer settings must match the existing pool issuer and app client. Every climb/photo read and mutation must check the authenticated owner. SQL grants here are table-level; row-level security is not implemented. Do not expose this role to browser clients.

Photo upload keys must be generated by the backend under the authenticated owner/climb prefix. Verify uploaded objects before adding metadata. Deleting SQL photo metadata does not delete S3 objects; implement object cleanup separately.

For Lambda, keep a small connection pool per warm instance and cap reserved concurrency so total connections fit the instance. Consider RDS Proxy when concurrency grows, accounting for its separate charges. A VPC Lambda reading Secrets Manager needs outbound access through an appropriate interface endpoint or NAT; uploading via presigned URLs does not require proxying photo bytes through Lambda.

## Data model and frontend mapping

- One climb is one record and one rendered bag tag. Repeated climbs, including on the same date, are allowed.
- users store a public UUID and a unique Cognito issuer/subject pair. Username is optional at first sign-in and lowercase when assigned.
- mountains use stable UUIDs plus the existing unique slugs. location remains the catalogue's free text; province/region normalization can be a later migration.
- mountain_trails belong to a mountain. A composite foreign key rejects a mismatched selected trail.
- climbs preserve climbedOn, optional finishedOn, notes and summitNotReached from the current UI. Dates use SQL date; API serialization must return YYYY-MM-DD without timezone conversion. finishedOn must be later than climbedOn, matching the current multi-day form.
- visibility defaults to PRIVATE; public sharing must be deliberate. A nullable pin_slot in 1..3 maps to pinned = pin_slot != null. When replacing pins, clear old slots and assign the selected three in a single transaction.
- climb_photos store S3 keys, cover choice and ordering. At most one cover is allowed per climb; the schema permits multiple photos even though the current UI displays one.
- No bag_tags table is needed until designs require separately persisted customization.
- updated_at is maintained by database triggers.

Before connecting the UI, add backend DTOs/repositories and CRUD endpoints for profiles, mountains, /me/climbs and photo upload URLs. Preserve existing local climb data and offer an explicit import; never silently upload another browser user's local data. This preparation does not switch persistence or implement those endpoints.

## Capacity and AWS limits

There is no fixed RDS app-user or climb-record limit. Capacity depends on indexed queries, instance memory/CPU and workload. Provisioned PostgreSQL storage can grow much larger than this setup; the relevant initial cap here is the configured 100 GiB autoscaling maximum. Inspect SHOW max_connections on the deployed instance; connection limits depend on instance memory and parameter settings, and connections are not the same as signed-in users. Monitor CPU, FreeableMemory, DatabaseConnections, FreeStorageSpace and query latency before resizing.

AWS documentation:

- Pricing: https://aws.amazon.com/rds/postgresql/pricing/
- Free Tier eligibility: https://aws.amazon.com/rds/free/
- RDS quotas and connection limits: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- Private VPC connectivity: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html
- TLS verification: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html

## Validation

Run checks/schema.sql after initialization to verify repeat climbs, mountain/trail matching, date ordering, pin constraints, cover uniqueness and cascading metadata deletion. Fixtures are rolled back. validate-template checks CloudFormation structure; it does not verify subnet membership, regional availability or connectivity. Verify these in the deployment account before creating resources.
