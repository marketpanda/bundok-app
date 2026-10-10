import { config } from "dotenv";
import { createServer } from "node:http";
import { copyFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../src/client.js";

const values = config({ path: fileURLToPath(new URL("../.env.runtime", import.meta.url)), quiet: true }).parsed;
if (!values?.DATABASE_URL) throw new Error("Runtime credential is required.");
process.env.DATABASE_URL = values.DATABASE_URL;
const cleanup = getPrisma();
const subject = randomUUID();
const issuer = "https://bundle-test.ambangeg.invalid";
let loads = 0;
const server = createServer((request, response) => {
  assert.equal(request.headers["x-amz-target"], "AmazonSSM.GetParameter");
  let body = "";
  request.on("data", chunk => { body += chunk; });
  request.on("end", () => {
    const command = JSON.parse(body);
    assert.equal(command.WithDecryption, true);
    assert.equal(command.Name, "/ambangeg/test/DATABASE_URL");
    loads++;
    response.writeHead(200, { "Content-Type": "application/x-amz-json-1.1" });
    response.end(JSON.stringify({ Parameter: { Type: "SecureString", Value: values.DATABASE_URL } }));
  });
});
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const port = (server.address() as { port: number }).port;
Object.assign(process.env, {
  AWS_ENDPOINT_URL_SSM: `http://127.0.0.1:${port}`, AWS_REGION: "ap-southeast-2",
  AWS_ACCESS_KEY_ID: "bundle-test-only", AWS_SECRET_ACCESS_KEY: "bundle-test-only",
  DATABASE_PARAMETER_NAME: "/ambangeg/test/DATABASE_URL", COGNITO_ISSUER: issuer, COGNITO_CLIENT_ID: "bundle-test",
});
try {
  // Run outside node_modules to prove the Lambda bundle is self-contained.
  const directory = await mkdtemp(join(tmpdir(), "ambangeg-lambda-test-"));
  const destination = join(directory, "handler.mjs");
  await copyFile(new URL("../dist/handler.mjs", import.meta.url), destination);
  const { handler } = await import(pathToFileURL(destination).href);
  const event = { version: "2.0", rawPath: "/me", requestContext: { requestId: "bundle-test", http: { method: "GET" }, authorizer: { jwt: { claims: { iss: issuer, sub: subject, token_use: "access", client_id: "bundle-test" } } } } };
  assert.equal((await handler(event)).statusCode, 200);
  assert.equal((await handler(event)).statusCode, 200);
  assert.equal(loads, 1);
  console.log("Standalone Lambda bundle verified: mocked encrypted SSM retrieval, warm-cache reuse and real Neon queries with the restricted login.");
} catch {
  console.error("Standalone bundle test failed. No credentials were printed.");
  process.exitCode = 1;
} finally {
  await cleanup.user.deleteMany({ where: { cognitoIssuer: issuer, cognitoSubject: subject } });
  await cleanup.$disconnect();
  await new Promise<void>(resolve => server.close(() => resolve()));
}
