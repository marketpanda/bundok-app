import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const values = config({ path: fileURLToPath(new URL("../.env.runtime", import.meta.url)), quiet: true }).parsed;
if (!values?.DATABASE_URL) throw new Error("Create the runtime role before publishing its parameter.");
const region = process.env.AWS_REGION ?? "ap-southeast-2";
const name = process.env.DATABASE_PARAMETER_NAME ?? "/ambangeg/dev/DATABASE_URL";
try {
  await new SSMClient({ region }).send(new PutParameterCommand({
    Name: name, Value: values.DATABASE_URL, Type: "SecureString", Tier: "Standard", KeyId: "alias/aws/ssm", Overwrite: true,
  }));
  console.log(`Stored the encrypted runtime URL in ${name} (${region}). No connection string was printed.`);
} catch {
  console.error("Parameter publishing failed. Check AWS authentication, selected region and SSM/KMS permissions. No credentials were printed.");
  process.exitCode = 1;
}
