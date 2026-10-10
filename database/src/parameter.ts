import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});
let loading: Promise<void> | undefined;
export function loadDatabaseParameter(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      const name = process.env.DATABASE_PARAMETER_NAME;
      if (!name) throw new Error("DATABASE_PARAMETER_NAME is required.");
      const result = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
      const value = result.Parameter?.Value;
      if (result.Parameter?.Type !== "SecureString" || !value) throw new Error("An encrypted database parameter is required.");
      const url = new URL(value);
      if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname.includes("-pooler.") || !["require", "verify-full"].includes(url.searchParams.get("sslmode") ?? "")) throw new Error("A pooled PostgreSQL TLS connection is required.");
      process.env.DATABASE_URL = value;
    })().catch(error => { loading = undefined; throw error; });
  }
  return loading;
}
