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
  assert.equal(config.devices[0].id, 'CLAW-HP'); assert.deepEqual(config.agents.map((a) => a.id), ['codex', 'claude']);
  const invalid = await fetch(`${base}/api/runs`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({deviceId:'elsewhere'}) });
  assert.equal(invalid.status, 400); assert.match((await invalid.json()).error, /Unknown device/);
  assert.deepEqual(await fetch(`${base}/api/runs`).then((r) => r.json()), []);
  await new Promise((resolve) => server.close(resolve)); await rm(data, { recursive:true, force:true });
});
