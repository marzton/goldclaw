import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./worker.js", import.meta.url), "utf8");
const wranglerConfig = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const assets = {
  fetch(request) {
    return new Response(`asset:${new URL(request.url).pathname}`, {
      headers: { "content-type": "text/plain" },
    });
  },
};

test("Cortex service bindings match the deployed gs-api topology", () => {
  const previewStart = wranglerConfig.indexOf('"preview": {');
  const productionStart = wranglerConfig.indexOf('"prod": {', previewStart);
  const previewConfig = wranglerConfig.slice(previewStart, productionStart);
  const productionConfig = wranglerConfig.slice(productionStart);

  assert.notEqual(previewStart, -1);
  assert.notEqual(productionStart, -1);
  assert.doesNotMatch(previewConfig, /"binding"\s*:\s*"GS_API"/u);
  assert.match(productionConfig, /"binding"\s*:\s*"GS_API"\s*,\s*"service"\s*:\s*"gs-api"/u);
  assert.doesNotMatch(productionConfig, /"environment"\s*:\s*"prod"/u);
});

test("Cortex production host serves assets and reports read-only cloud status", async () => {
  const env = { ASSETS: assets, CORTEX_ENVIRONMENT: "production" };
  const root = await worker.fetch(new Request("https://cortex.goldshore.ai/"), env);
  assert.equal(await root.text(), "asset:/");

  const health = await worker.fetch(new Request("https://cortex.goldshore.ai/health"), env);
  assert.deepEqual(await health.json(), {
    ok: true,
    service: "gold-shore-cortex",
    environment: "production",
    mode: "cloud-read-only",
    action_gateway: "disconnected",
    repository: "marzton/goldclaw",
  });
});

test("Cortex cloud surface fails closed for dispatch", async () => {
  const env = { ASSETS: assets, CORTEX_ENVIRONMENT: "preview" };
  const response = await worker.fetch(
    new Request("https://preview.cortex.goldshore.ai/api/runs", { method: "POST" }),
    env,
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "ACTION_GATEWAY_UNAVAILABLE");
});

test("non-Cortex hosts retain the goldclaw OAuth/MCP front-door behavior", async () => {
  const response = await worker.fetch(new Request("https://mcp.goldshore.ai/health"), {});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).service, "goldclaw");
});

test("Cortex exposes gs-api reads and gates mutations on explicit approval", async () => {
  const calls = [];
  const gsApi = { fetch(request) { calls.push(request); return Response.json({ ok: true, path: new URL(request.url).pathname }); } };
  const env = { ASSETS: assets, GS_API: gsApi, CORTEX_ENVIRONMENT: "preview", CORTEX_APPROVAL_TOKEN: "test-approval" };
  const read = await worker.fetch(new Request("https://preview.cortex.goldshore.ai/api/gs-api/mcp/capabilities"), env);
  assert.equal(read.status, 200);
  assert.equal((await read.json()).path, "/mcp/capabilities");
  const denied = await worker.fetch(new Request("https://preview.cortex.goldshore.ai/api/gs-api/admin/users", { method: "POST" }), env);
  assert.equal(denied.status, 403);
  const approved = await worker.fetch(new Request("https://preview.cortex.goldshore.ai/api/gs-api/admin/users", { method: "POST", headers: { "x-cortex-approval": "test-approval" } }), env);
  assert.equal(approved.status, 200);
  assert.equal(calls.length, 2);
});
