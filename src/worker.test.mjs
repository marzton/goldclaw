import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./worker.js", import.meta.url), "utf8");
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const assets = {
  fetch(request) {
    return new Response(`asset:${new URL(request.url).pathname}`, {
      headers: { "content-type": "text/plain" },
    });
  },
};

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
