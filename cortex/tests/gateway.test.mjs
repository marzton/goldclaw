import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('config, validation, and persistent run listing are local and structured', async () => {
  const data = await mkdtemp(path.join(tmpdir(), 'cortex-test-'));
  process.env.NODE_ENV = 'test'; process.env.CORTEX_DATA_DIR = data;
  const { server } = await import(`../server.mjs?test=${Date.now()}`);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const config = await fetch(`${base}/api/config`).then((r) => r.json());
  assert.equal(config.currentDeviceId, 'CLAW-HP');
  assert.deepEqual(config.devices.map((device) => device.id), ['CLAW-HP', 'CLAW-ANDROID']);
  assert.equal(config.devices.find((device) => device.id === 'CLAW-HP').status, 'local');
  assert.equal(config.devices.find((device) => device.id === 'CLAW-ANDROID').status, 'offline');
  assert.deepEqual(config.agents.map((a) => a.id), ['codex', 'claude']);
  const invalid = await fetch(`${base}/api/runs`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({deviceId:'elsewhere'}) });
  assert.equal(invalid.status, 400); assert.match((await invalid.json()).error, /Unknown device/);
  assert.deepEqual(await fetch(`${base}/api/runs`).then((r) => r.json()), []);
  await new Promise((resolve) => server.close(resolve)); await rm(data, { recursive:true, force:true });
});

test('registered devices cannot be dispatched through the wrong gateway', async () => {
  const data = await mkdtemp(path.join(tmpdir(), 'cortex-test-'));
  process.env.NODE_ENV = 'test'; process.env.CORTEX_DATA_DIR = data;
  const { server } = await import(`../server.mjs?device-test=${Date.now()}`);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/runs`, {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({deviceId:'CLAW-ANDROID', repositoryId:'REPO-GOLDCLAW', taskId:'GSC-0003A', agentId:'codex', prompt:'test'})
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /not served by this gateway/);
  await new Promise((resolve) => server.close(resolve)); await rm(data, { recursive:true, force:true });
});

test('configured gateway token protects API routes', async () => {
  const data = await mkdtemp(path.join(tmpdir(), 'cortex-test-'));
  process.env.NODE_ENV = 'test'; process.env.CORTEX_DATA_DIR = data;
  process.env.CORTEX_GATEWAY_TOKEN = 'test-only-token';
  const { server } = await import(`../server.mjs?auth-test=${Date.now()}`);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const denied = await fetch(`${base}/api/config`);
  assert.equal(denied.status, 401);
  assert.equal((await denied.json()).code, 'AUTH_REQUIRED');
  const allowed = await fetch(`${base}/api/config`, { headers: { authorization: 'Bearer test-only-token' } });
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).actionGateway.authenticated, true);
  await new Promise((resolve) => server.close(resolve)); await rm(data, { recursive:true, force:true });
  delete process.env.CORTEX_GATEWAY_TOKEN;
});
