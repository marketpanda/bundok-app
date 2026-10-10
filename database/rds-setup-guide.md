# Set up Ambangeg on Amazon RDS PostgreSQL, step by step

> Archived alternative: the active setup is now [Neon + Prisma](neon-setup-guide.md). Do not create an RDS stack for the Neon setup.

This guide takes you from the AWS console to an initialized Ambangeg database. It uses the repository's CloudFormation template so the database settings match the prepared SQL schema.

**Start here even if you are currently on the RDS dashboard.** Open CloudFormation in another tab; it will create the RDS instance for you. If you already created an RDS instance, do not create a second one by following this guide unchanged.

This is **standard RDS PostgreSQL**, with a provisioned database instance. The planned API Gateway and Lambda backend is serverless. **Prisma is not installed or configured**, and these steps use plain SQL. Neon is an alternative database provider; it is not used in this walkthrough.

At the end, the database will contain mountains and trails. Connecting the website, implementing its API and uploading user photos are later steps.

## 1. Choose your region and starting size

In the AWS console's top-right region selector, choose the region where you want the database and future backend. Prefer your existing Cognito/backend region. The examples below use **Sydney, `ap-southeast-2`**; replace it everywhere if you choose another region.

Open **Billing and Cost Management** to check your account plan and Free Tier eligibility. Under **Budgets**, create a monthly cost budget with an email alert at an amount you are comfortable spending. A budget alert sends notifications; it does not stop resources automatically.

The table below describes the database that **CloudFormation will create in step 5**. You do not enter these settings on the RDS **Create database** screen. Prepare your choices now; fill in the named CloudFormation parameters after uploading `rds.template.json`.

| Setting | Value for the first deployment | What you do in CloudFormation |
| --- | --- | --- |
| Engine | PostgreSQL | Already fixed in the template; there is no Engine field |
| Engine version | An available PostgreSQL `17.x` minor version from step 4 | Enter the exact version in `EngineVersion` |
| Instance | `db.t4g.micro` for a small development database; `db.t4g.small` for more memory | Select your choice in `InstanceClass`; the template defaults to `db.t4g.small` |
| Availability | Single-AZ | Leave `MultiAZ` as `false` |
| Storage | 20 GiB gp3, autoscaling maximum 100 GiB | Already fixed in the template; no storage field to fill |
| Database name | `ambangeg` | Already fixed in the template |
| Administrator | `ambangeg_admin` | Already fixed in the template; RDS generates and manages the password in Secrets Manager |
| Public access | Disabled | Already fixed in the template |
| Private network | Your VPC, two private subnets and client security group | Select `VpcId`, `PrivateSubnetIds` and `ClientSecurityGroupId` from steps 2–3 |

The template defaults to **`db.t4g.small`**. Select `db.t4g.micro` explicitly in step 5 if that is your choice. Micro is supported by the newer Free account plan; credits and eligibility still determine what is covered. RDS compute, storage and related services can incur charges. See [AWS Free Tier](https://aws.amazon.com/rds/free/) and [RDS pricing](https://aws.amazon.com/rds/postgresql/pricing/).

**Checkpoint:** you know your region, account plan and instance choice.

## 2. Prepare a VPC and two private subnets

If you already have a suitable VPC with two private subnets in different availability zones, record their IDs and skip the creation steps. Confirm they are in your selected region and the same VPC.

For a new development network:

1. Open **VPC → Your VPCs → Create VPC**.
2. Choose **VPC only**. Name it `ambangeg-dev` and use IPv4 CIDR `10.40.0.0/16`. Use another non-overlapping range if this conflicts with an existing network you need to connect.
3. Create the VPC and record its `vpc-...` ID. Under its actions/settings, enable DNS resolution and DNS hostnames.
4. Open **Subnets → Create subnet** and select this VPC.
5. Create `ambangeg-private-a`: select one availability zone and use CIDR `10.40.1.0/24`.
6. Create `ambangeg-private-b`: select a **different availability zone** and use CIDR `10.40.2.0/24`.
7. Record both `subnet-...` IDs. Leave automatic public IPv4 assignment disabled.
8. Open **Route tables → Create route table**. Name it `ambangeg-private`, select this VPC and create it.
9. Select that route table, open **Subnet associations → Edit subnet associations**, select both new subnets and save.

For this database-initialization path, the route table needs its local VPC route and the S3 gateway route added in step 8. No internet gateway or NAT gateway is required. These private subnets will not have general internet access; the future backend may need additional service endpoints or outbound connectivity.

A database subnet group needs subnets in at least two availability zones even when the database itself is Single-AZ. The template creates that subnet group from your chosen IDs. [AWS VPC setup](https://docs.aws.amazon.com/vpc/latest/userguide/create-vpc.html), [RDS VPC guidance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html).

**Checkpoint:** you have one VPC ID and two subnet IDs, with different availability zones.

## 3. Create the client security group

1. Open **VPC → Security groups → Create security group**.
2. Name it `ambangeg-db-client`; use a description such as `Private administration and future backend access to Ambangeg`.
3. Select the VPC from step 2.
4. Leave inbound rules empty. Keep the default outbound rule for this initial setup.
5. Create it and record its `sg-...` ID.

This is the **client** group, which you will attach to CloudShell's VPC environment. The template creates a separate **database** group and permits TCP port 5432 from this client group. The client group is not the group you attach directly to RDS.

**Checkpoint:** your client security group belongs to the same VPC as both subnets.

## 4. Find an available PostgreSQL version

Open the normal AWS **CloudShell** using the terminal icon in the console. This first shell is for AWS control-plane commands, not connecting to the private database.

Run:

```bash
aws rds describe-db-engine-versions \
  --engine postgres --region ap-southeast-2 \
  --query "DBEngineVersions[?starts_with(EngineVersion, '17.')].EngineVersion" \
  --output table
```

Choose a current available `17.x` version from the output. Check that it supports your instance choice, replacing `YOUR_17_MINOR_VERSION`:

```bash
aws rds describe-orderable-db-instance-options \
  --engine postgres --engine-version YOUR_17_MINOR_VERSION \
  --db-instance-class db.t4g.micro --region ap-southeast-2 \
  --query 'OrderableDBInstanceOptions[].{Class:DBInstanceClass,Version:EngineVersion,Storage:StorageType}' \
  --output table
```

Use `db.t4g.small` in the command if that is your choice. Confirm the result includes `gp3`. Empty output means you must select another available version/class combination.

**Checkpoint:** you have an exact engine version, not just `17`.

## 5. Create the CloudFormation stack

1. Open **CloudFormation → Stacks → Create stack → With new resources (standard)** in the same region.
2. Choose the option to supply an existing template, then **Upload a template file**.
3. Upload `D:\dev\bundok-app\database\rds.template.json` and choose **Next**.
4. Name the stack `ambangeg-db-dev`.
5. Fill the parameters using this table:

| Parameter | What to select or enter |
| --- | --- |
| `VpcId` | Your `vpc-...` from step 2 |
| `PrivateSubnetIds` | Both private `subnet-...` IDs |
| `ClientSecurityGroupId` | The `sg-...` from step 3 |
| `EngineVersion` | Exact version from step 4 |
| `InstanceClass` | Your chosen micro or small instance |
| `MultiAZ` | `false` for this development setup |

6. Continue through stack options. Use the normal rollback behavior; no custom service role is required unless your account's policies require one.
7. Review the parameters, then submit the stack creation.
8. Watch **Events** until the stack reaches **CREATE_COMPLETE**. If creation fails, read the first relevant failed resource event before retrying.

The template creates the RDS instance, database security group, subnet group and PostgreSQL parameter group. It enables encrypted storage, required TLS, seven-day backups, deletion protection and PostgreSQL log export. It asks RDS to manage the administrator password in Secrets Manager. It does not create the network, application API or photo bucket.

The identity deploying the stack needs permission to create these resources. An `AccessDenied` event requires the appropriate account permissions, not a change to database networking. [CloudFormation console workflow](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-create-stack.html).

**Checkpoint:** CloudFormation says `CREATE_COMPLETE`; RDS shows the new database as available.

## 6. Record the endpoint and retrieve the admin password

1. In your stack, open **Outputs**.
2. Record `DatabaseEndpoint`, `DatabasePort`, `AdminSecretArn` and `DatabaseSecurityGroupId`.
3. Open **Secrets Manager** in the same region and find the secret identified by `AdminSecretArn`.
4. Choose **Retrieve secret value** and obtain the password privately when you need to connect.

The connection username is `ambangeg_admin` and database name is `ambangeg`. The endpoint is a hostname; do not prepend `https://`. Keep passwords out of chat, screenshots, Git and frontend environment variables.

## 7. Prepare the SQL files on your Windows computer

Run these commands in **local PowerShell**, not CloudShell:

```powershell
Set-Location D:\dev\bundok-app
node database/scripts/prepare-seed.mjs
Invoke-WebRequest -Uri 'https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem' -OutFile database/global-bundle.pem
Compress-Archive -Path database/migrations/001_initial.sql,database/seed.sql,database/checks/schema.sql,database/global-bundle.pem -DestinationPath database/database-init.zip -Force
```

You need Node.js available locally. The seed generator reads the current mountain catalogue; its printed count is the count to expect after import. The ZIP contains four files at its root: `001_initial.sql`, `seed.sql`, `schema.sql` and `global-bundle.pem`. It contains no database password.

The certificate bundle enables server certificate verification. [RDS TLS guidance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html).

## 8. Transfer the files through private S3 access

CloudShell **VPC** environments do not support the usual upload/download menu and have temporary storage. Use S3 for the initialization bundle. [CloudShell VPC constraints](https://docs.aws.amazon.com/cloudshell/latest/userguide/using-cshell-in-vpc.html).

1. Open **S3 → Create bucket**. Choose a globally unique name, for example `ambangeg-db-setup-YOUR_UNIQUE_SUFFIX`, and the same region as RDS.
2. Keep **Block all public access** enabled and the default encryption enabled. Create the bucket.
3. Open the bucket and upload `database/database-init.zip` through the S3 console.
4. Open **VPC → Endpoints → Create endpoint**. Select AWS services and search for `com.amazonaws.ap-southeast-2.s3`, using your region in the name.
5. Select the S3 service with type **Gateway**, not Interface. Select your VPC and the private route table associated with the two subnets.
6. For this initial walkthrough, use the default endpoint policy and create the endpoint. It provides a network route; your signed-in identity still needs permission to read the uploaded S3 object.

S3 gateway endpoints have no additional endpoint charge. S3 storage and requests still have their usual pricing. This route allows same-region S3 access without adding a NAT gateway. [S3 gateway endpoint documentation](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html).

## 9. Open CloudShell inside the VPC

1. Open CloudShell, choose **+ → Create VPC environment**.
2. Name it `ambangeg-db-admin`.
3. Select your VPC, one of the private subnets, and **`ambangeg-db-client` from step 3**.
4. Create the environment and wait for its terminal to open.

This shell can reach the private RDS endpoint. The normal CloudShell environment and your laptop cannot directly connect to this private database. Creating the VPC environment requires the corresponding CloudShell and network permissions. [Create a CloudShell VPC environment](https://docs.aws.amazon.com/cloudshell/latest/userguide/creating-vpc-environment.html).

In the **VPC CloudShell terminal**, run:

```bash
psql --version
aws s3 cp s3://YOUR_SETUP_BUCKET/database-init.zip ./database-init.zip --region ap-southeast-2
unzip -o database-init.zip -d database-init
cd database-init
ls
```

Replace `YOUR_SETUP_BUCKET`. Confirm all four bundle files are listed. An older supported `psql` client can execute these SQL files against PostgreSQL 17; this setup does not require removing the existing client.

If `psql` is missing, use an administration environment with PostgreSQL client tools installed. Package installation needs package-repository connectivity, which this isolated network does not provide. Do not assume `dnf install` or an internet download will work here.

## 10. Connect, initialize and verify

Still in the **VPC CloudShell terminal**, set these variables:

```bash
export PGHOST='YOUR_DATABASE_ENDPOINT'
export PGPORT='5432'
export PGDATABASE='ambangeg'
export PGUSER='ambangeg_admin'
export PGSSLMODE='verify-full'
export PGSSLROOTCERT="$PWD/global-bundle.pem"
```

Use `DatabaseEndpoint` from step 6. Test the connection; `-W` prompts for the administrator password:

```bash
psql -W -v ON_ERROR_STOP=1 -c 'SELECT current_database(), current_user;'
```

Expected database and user: `ambangeg` and `ambangeg_admin`. If that succeeds, run these commands **in order**:

```bash
psql -W -v ON_ERROR_STOP=1 -f 001_initial.sql
psql -W -v ON_ERROR_STOP=1 -f seed.sql
psql -W -v ON_ERROR_STOP=1 -f schema.sql
```

The migration creates the schema once. Do not rerun it after successful initialization. The seed can be rerun to refresh catalogue data while preserving existing IDs. The integrity check creates temporary test records inside a transaction, reports `Schema checks passed`, then rolls them back.

Verify the real imported data and connection configuration:

```bash
psql -W -v ON_ERROR_STOP=1 \
  -c 'SELECT count(*) AS mountains FROM ambangeg.mountains;' \
  -c 'SELECT count(*) AS trails FROM ambangeg.mountain_trails;' \
  -c 'SHOW max_connections;' \
  -c 'SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid();'
```

For the catalogue used when this guide was written, expect **2,022 mountains and 134 trails**. Regenerating from an updated catalogue can change those counts. The SSL result should be `t`.

**Checkpoint:** the schema check passes, catalogue counts match the generated seed, and TLS is enabled.

## 11. Finish administration and prepare the backend

The database is initialized. User profiles, climbs and photo metadata will stay empty until the application API writes them.

Before connecting the app, follow [Runtime credentials and authorization](README.md#runtime-credentials-and-authorization) to create the restricted `ambangeg_app` login and store its credentials in a separate backend secret. Keep the administrator account for migrations. Then implement:

- API Gateway with a Cognito JWT authorizer.
- Lambda database access, a small connection pool and suitable concurrency limits.
- Authenticated climb/profile CRUD and ownership checks.
- Private S3 photo storage and presigned uploads.
- Frontend synchronization through the API.

The VPC setup above provides database and S3 connectivity only. A future VPC Lambda reading Secrets Manager needs a Secrets Manager interface endpoint or another suitable outbound path; those infrastructure choices have separate costs.

Prisma can be introduced as a separate implementation step. The current migration is plain SQL; switching to Prisma requires reconciling the existing schema and migration history rather than running a second initial migration against these tables.

When finished, exit your database sessions and delete the temporary S3 setup object if you no longer need it. CloudShell VPC files disappear when the environment ends; your RDS data persists. The running database continues to incur charges under your account's pricing/credits. RDS deletion protection and CloudFormation snapshot policies mean deleting the stack is not a simple cost-off switch; retained snapshots can also incur charges.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| CloudFormation creation fails | Read the failed resource's Events entry; verify permissions, engine/class availability, VPC and subnet IDs |
| Connection times out | Use the VPC CloudShell environment; verify its client group matches the stack parameter, VPC IDs match, and network ACLs permit traffic |
| `aws s3 cp` hangs or cannot connect | Check the same-region S3 gateway endpoint and its route-table association |
| S3 `AccessDenied` | Check the signed-in identity's object-read permissions, endpoint policy and bucket policy |
| Certificate verification fails | Check the CA file exists and `PGHOST` is the exact RDS endpoint |
| Password authentication fails | Retrieve the current admin password from the stack's secret; confirm username/database |
| Schema already exists | The initial migration may already have succeeded; inspect it before rerunning |
| Website still uses local storage | Expected: database initialization does not implement the API or frontend synchronization |

Keep the database private when diagnosing errors. Opening port 5432 to the public internet does not fix an incorrect VPC environment or security-group selection.
