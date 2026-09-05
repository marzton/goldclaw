import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const publicRoot = path.join(here, 'public');
const dataRoot = process.env.CORTEX_DATA_DIR ? path.resolve(process.env.CORTEX_DATA_DIR) : path.join(here, 'data', 'runs');
const port = Number(process.env.CORTEX_PORT || 4317);
const registry = JSON.parse(await readFile(path.join(here, 'registry.json'), 'utf8'));
const runs = new Map();
const subscribers = new Map();
await mkdir(dataRoot, { recursive: true });

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}
async function body(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 1_000_000) throw new Error('Request body too large'); }
  return raw ? JSON.parse(raw) : {};
}
function repository(id) {
  const item = registry.repositories.find((candidate) => candidate.id === id);
  if (!item) throw new Error('Unknown repository');
  const resolved = path.resolve(repoRoot, item.path);
  const relative = path.relative(repoRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Repository is outside the local registry boundary');
  return { ...item, resolved };
}
function validateSelection(input) {
  if (!registry.devices.some((item) => item.id === input.deviceId)) throw new Error('Unknown device');
  if (!registry.tasks.some((item) => item.id === input.taskId)) throw new Error('Unknown task');
  if (!registry.agents.some((item) => item.id === input.agentId)) throw new Error('Unknown agent');
  if (!String(input.prompt || '').trim()) throw new Error('Prompt is required');
  const repo = repository(input.repositoryId);
  const chips = input.context || { files: [], skills: [], plugins: [] };
  for (const file of chips.files || []) {
    const selected = path.resolve(repo.resolved, file);
    const relative = path.relative(repo.resolved, selected);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Context file escapes repository: ${file}`);
  }
  return { repo, chips };
}
function emit(run, type, payload = {}) {
  const event = { sequence: run.events.length + 1, at: new Date().toISOString(), type, ...payload };
  run.events.push(event);
  for (const res of subscribers.get(run.id) || []) res.write(`data: ${JSON.stringify(event)}\n\n`);
  void persist(run);
}
async function persist(run) {
  await writeFile(path.join(dataRoot, `${run.id}.json`), JSON.stringify({ ...run, process: undefined }, null, 2));
}
function execFile(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, windowsHide: true, shell: false });
    let stdout = '', stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; }); child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => resolve({ code: -1, stdout, stderr: `${stderr}${error.message}` }));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}
async function gitState(cwd) {
  const [head, status, diff] = await Promise.all([
    execFile('git.exe', ['rev-parse', 'HEAD'], cwd), execFile('git.exe', ['status', '--short'], cwd), execFile('git.exe', ['diff', '--stat'], cwd)
  ]);
  return { commit: head.stdout.trim() || null, status: status.stdout, diffStat: diff.stdout };
}
function contextPrompt(run, prompt) {
  const chips = run.context;
  return [`Cortex task ${run.taskId} on ${run.deviceId}.`, `Work directly in ${run.workingDirectory}; do not clone or copy it.`,
    chips.files?.length ? `Context files: ${chips.files.join(', ')}` : '', chips.skills?.length ? `Requested skills: ${chips.skills.join(', ')}` : '',
    chips.plugins?.length ? `Requested plugins: ${chips.plugins.join(', ')}` : '', '', prompt].filter(Boolean).join('\n');
}
function adapterCommand(run, prompt, resumeId) {
  const fullPrompt = contextPrompt(run, prompt);
  if (run.agentId === 'codex') return { command: 'codex.exe', args: resumeId ? ['exec', 'resume', '--json', resumeId, fullPrompt] : ['exec', '--json', '--sandbox', 'workspace-write', '-C', run.workingDirectory, fullPrompt] };
  const command = path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
  const args = ['-p', '--verbose', '--output-format', 'stream-json', '--permission-mode', 'acceptEdits'];
  if (resumeId) args.push('--resume', resumeId); args.push(fullPrompt);
  return { command, args };
}
function captureSessionId(run, line) {
  try { const item = JSON.parse(line); const id = item.session_id || item.thread_id || item.conversation_id; if (id && id !== run.sessionId) { run.sessionId = id; emit(run, 'session', { sessionId: id }); } } catch {}
}
async function launch(run, prompt, resumeId = null) {
  run.status = 'running'; run.before ??= await gitState(run.workingDirectory);
  const spec = adapterCommand(run, prompt, resumeId); emit(run, resumeId ? 'continued' : 'started', { adapter: run.agentId, resumedSessionId: resumeId });
  const child = spawn(spec.command, spec.args, { cwd: run.workingDirectory, windowsHide: true, shell: false, env: process.env });
  child.stdin.end();
  run.process = child; let output = '';
  for (const [stream, source] of [['stdout', child.stdout], ['stderr', child.stderr]]) {
    let pending = '';
    source.on('data', (chunk) => { const text = chunk.toString(); output += text; emit(run, 'output', { stream, text }); pending += text; const lines = pending.split(/\r?\n/); pending = lines.pop(); for (const line of lines) captureSessionId(run, line); });
  }
  child.on('error', (error) => emit(run, 'output', { stream: 'stderr', text: `${error.message}\n` }));
  child.on('close', async (code, signal) => {
    run.process = undefined; run.exitCode = code; run.signal = signal;
    run.status = run.stopRequested ? 'stopped' : code === 0 ? 'completed' : 'failed'; run.output = `${run.output || ''}${output}`.slice(-200_000);
    run.after = await gitState(run.workingDirectory); run.finishedAt = new Date().toISOString(); emit(run, 'finished', { status: run.status, exitCode: code, git: run.after }); await persist(run);
  });
}
async function stopRun(run) {
  if (!run.process || run.status !== 'running') throw new Error('Run is not active');
  run.stopRequested = true;
  if (process.platform === 'win32') spawn('taskkill.exe', ['/PID', String(run.process.pid), '/T', '/F'], { windowsHide: true }); else run.process.kill('SIGTERM');
  emit(run, 'stop-requested');
}
function handoffPrompt(source) {
  return ['Structured Cortex cross-agent handoff. Resume from this record without asking for a transcript.', JSON.stringify({
    task_id: source.taskId, objective: source.prompt, device: source.deviceId, repo: source.repositoryId, path: source.workingDirectory,
    environment: 'local', context: source.context, git_before: source.before, git_after: source.after, codex_output: source.output,
    remaining: ['Inspect the work and continue the original task.'], approval_required: 'None for local repository edits.'
  }, null, 2)].join('\n\n');
}
async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/config') return json(res, 200, { ...registry, mode: 'local', environment: 'local', actionGateway: { available: true } });
  if (req.method === 'GET' && url.pathname === '/api/runs') {
    const files = await readdir(dataRoot).catch(() => []); const stored = await Promise.all(files.filter((f) => f.endsWith('.json')).map(async (f) => JSON.parse(await readFile(path.join(dataRoot, f), 'utf8'))));
    return json(res, 200, stored.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
  const match = url.pathname.match(/^\/api\/runs\/([^/]+)(?:\/(events|stop|continue|handoff))?$/);
  if (req.method === 'GET' && match?.[2] === 'events') {
    const run = runs.get(match[1]); if (!run) return json(res, 404, { error: 'Run not found in this gateway process' });
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    for (const event of run.events) res.write(`data: ${JSON.stringify(event)}\n\n`);
    const set = subscribers.get(run.id) || new Set(); set.add(res); subscribers.set(run.id, set); req.on('close', () => set.delete(res)); return;
  }
  if (req.method === 'POST' && url.pathname === '/api/runs') {
    const input = await body(req); const { repo, chips } = validateSelection(input);
    const run = { id: randomUUID(), createdAt: new Date().toISOString(), deviceId: input.deviceId, repositoryId: input.repositoryId, workingDirectory: repo.resolved, taskId: input.taskId, agentId: input.agentId, context: chips, prompt: input.prompt.trim(), status: 'queued', events: [] };
    runs.set(run.id, run); await persist(run); void launch(run, run.prompt); return json(res, 202, { id: run.id });
  }
  const run = match ? runs.get(match[1]) : null;
  if (req.method === 'POST' && run && match[2] === 'stop') { await stopRun(run); return json(res, 202, { status: 'stopping' }); }
  if (req.method === 'POST' && run && match[2] === 'continue') { const input = await body(req); if (!run.sessionId) throw new Error('No resumable agent session was captured'); run.stopRequested = false; void launch(run, input.prompt || 'Continue the task.', run.sessionId); return json(res, 202, { status: 'running' }); }
  if (req.method === 'POST' && run && match[2] === 'handoff') {
    const target = { ...run, id: randomUUID(), createdAt: new Date().toISOString(), agentId: 'claude', sessionId: null, status: 'queued', events: [], prompt: handoffPrompt(run), before: undefined, after: undefined, output: '' };
    runs.set(target.id, target); await persist(target); void launch(target, target.prompt); return json(res, 202, { id: target.id });
  }
  if (req.method === 'GET' && match && !match[2]) {
    const live = runs.get(match[1]); if (live) return json(res, 200, { ...live, process: undefined });
    try { return json(res, 200, JSON.parse(await readFile(path.join(dataRoot, `${match[1]}.json`), 'utf8'))); } catch { return json(res, 404, { error: 'Run not found' }); }
  }
  const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1); const safe = path.resolve(publicRoot, requested);
  if (!safe.startsWith(publicRoot)) return json(res, 404, { error: 'Not found' });
  try { const content = await readFile(safe); const ext = path.extname(safe); const type = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : 'text/html'; res.writeHead(200, { 'content-type': `${type}; charset=utf-8` }); res.end(content); } catch { json(res, 404, { error: 'Not found' }); }
}
export const server = http.createServer((req, res) => route(req, res).catch((error) => json(res, 400, { error: error.message })));
if (process.env.NODE_ENV !== 'test') server.listen(port, '127.0.0.1', () => console.log(`Cortex local command surface: http://127.0.0.1:${port}`));
