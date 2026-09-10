import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Source/positions are independent test inputs, never derived from diagnostics.
const valid = `export function twice(value: number): number { return value * 2; }
export const answer: number = twice(1);
define status {
  name "中文测试状态" as HarnessStatus;
  usage 2;
}
`;
const bad = valid.replace('usage 2;', 'usage "wrong";');
const uri = 'file:///workspace/example.gts';
const sha = text => createHash('sha256').update(text).digest('hex');

export async function run(h) {
  const { page, expect } = h;
  const raw = { schemaVersion: 1, runNonce: process.env.HARNESS_NONCE,
    startedAtMs: Date.now(), platform: process.platform, browserVersion: await h.browser.version(),
    phases: [], switches: [], outages: [], workers: [], problems: [] };
  const directory = process.env.GTS_BROWSER_ARTIFACTS;
  const checkpoint = async stage => {
    raw.stage = stage;
    raw.editorEvents = await page.evaluate(() => globalThis.webHarnessEvents);
    await writeFile(path.join(directory, 'web-session-progress.json'), JSON.stringify(raw, null, 2));
  };
  const cdp = await page.createCDPSession();
  const workerSessions = new Map();
  const pending = new Set();
  const track = promise => { pending.add(promise); promise.catch(error => raw.problems.push(String(error))).finally(() => pending.delete(promise)); };
  cdp.on('Target.attachedToTarget', event => track((async () => {
    const child = cdp.connection().session(event.sessionId);
    const observation = { targetId: event.targetInfo.targetId, url: event.targetInfo.url,
      attachedAtMs: Date.now(), scripts: [] };
    if (event.targetInfo.type === 'worker' && event.targetInfo.url.includes('gts-language-server.worker')) {
      raw.workers.push(observation);
      workerSessions.set(observation.targetId, { child, observation });
      await child.send('Runtime.enable');
      await child.send('Debugger.enable');
      child.on('Debugger.scriptParsed', script => {
        if (/typescript@[^/]+\/lib\/typescript\.js(?:\?|$)/.test(script.url)) track((async () => {
          const result = await child.send('Debugger.getScriptSource', { scriptId: script.scriptId });
          const file = `web-worker-${observation.targetId}-${script.scriptId}.js`;
          await writeFile(path.join(directory, file), result.scriptSource);
          observation.scripts.push({ url: script.url, scriptId: script.scriptId, file,
            sha256: sha(result.scriptSource), parsedAtMs: Date.now() });
        })());
      });
      // Volar temporarily installs { exports:{} }, imports TypeScript, and restores
      // module. Capture that actual exported object without replacing any export.
      await child.send('Runtime.evaluate', { expression: `(() => {
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'module');
        let current = globalThis.module;
        Object.defineProperty(globalThis, 'module', { configurable: true,
          get() { return current; },
          set(next) {
            const previous = current;
            current = next;
            if (typeof previous?.exports?.createLanguageService === 'function' && typeof previous.exports.version === 'string') {
              const sdk = previous.exports;
              globalThis.__harnessLoadedSdk = sdk;
              globalThis.__harnessSdkProof = { version: sdk.version,
                hasLanguageService: typeof sdk.createLanguageService === 'function',
                hasProgram: typeof sdk.createProgram === 'function',
                atMs: performance.timeOrigin + performance.now(), moduleRestored: true };
              if (descriptor) Object.defineProperty(globalThis, 'module', descriptor);
              else { delete globalThis.module; if (next !== undefined) globalThis.module = next; }
            }
          }
        });
      })()` });
    }
    await child.send('Runtime.runIfWaitingForDebugger');
  })()));
  cdp.on('Target.detachedFromTarget', event => {
    const entry = [...workerSessions.values()].find(item => item.child.id() === event.sessionId);
    if (entry) entry.observation.detachedAtMs = Date.now();
  });
  await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  await page.evaluate(async () => {
    const editor = await new Function('url', 'return import(url)')('/src/dev-editor.ts');
    globalThis.webHarnessEvents = [];
    globalThis.webHarnessSubscription = editor.observeLanguageService(event => {
      const detail = event.kind === 'diagnostics-displayed' ? { uri: event.detail.uri,
        diagnostics: event.detail.diagnostics.map(diagnostic => ({ code: diagnostic.code?.value ?? diagnostic.code,
          message: diagnostic.message, severity: diagnostic.severity + 1,
          range: { start: { line: diagnostic.range.start.line, character: diagnostic.range.start.character },
            end: { line: diagnostic.range.end.line, character: diagnostic.range.end.character } } })) } : event.detail;
      globalThis.webHarnessEvents.push(structuredClone({ ...event, detail }));
    });
  });
  const now = () => page.evaluate(() => performance.timeOrigin + performance.now());
  const snapshot = async () => {
    const result = await page.evaluate(() => {
      const document = globalThis.browserTestVscode.workspace.textDocuments.find(d => d.uri.path === '/workspace/example.gts');
      return { uri: document.uri.toString(), version: document.version, text: document.getText() };
    });
    return { ...result, sha256: sha(result.text) };
  };
  const activeId = () => page.evaluate(() => globalThis.webHarnessEvents.findLast(event => event.kind === 'client-ready')?.sessionId);
  async function phase(sessionId, phase) {
    const source = await snapshot();
    expect(source.text).toBe(phase === 'bad' ? bad : valid);
    await page.waitForFunction((id, version, isBad) => {
      const matching = globalThis.webHarnessEvents.filter(event => event.sessionId === id &&
        event.kind === 'protocol-receive' && event.detail.method === 'textDocument/publishDiagnostics' &&
        event.detail.params.uri === 'file:///workspace/example.gts' && event.detail.params.version === version);
      const last = matching.at(-1);
      if (!last || performance.timeOrigin + performance.now() - last.atMs < 500) return false;
      return isBad ? last.detail.params.diagnostics.some(d => d.code === 2345 && d.severity === 1 &&
        d.range.start.line === 4 && d.range.start.character === 8 && d.range.end.line === 4 && d.range.end.character === 15)
        : last.detail.params.diagnostics.every(d => d.severity !== 1);
    }, { timeout: 60000 }, sessionId, source.version, phase === 'bad');
    const featuresStartedAtMs = await now();
    if (phase !== 'bad') await h.languageFeatures(sessionId);
    raw.phases.push({ sessionId, phase, source, featuresStartedAtMs, completedAtMs: await now() });
    await checkpoint(`${sessionId}/${phase}`);
    return source;
  }
  async function initial(route) {
    await h.ready(route);
    const sessionId = await activeId();
    expect(sessionId).toBeTruthy();
    const source = await phase(sessionId, 'valid');
    if (route === 'browser-local') {
      const alive = [...workerSessions.values()].filter(item => item.observation.scripts.length && !item.observation.detachedAtMs);
      expect(alive).toHaveLength(1);
      const { child, observation } = alive[0];
      const result = await child.send('Runtime.evaluate', { expression: `({ ...globalThis.__harnessSdkProof,
        observedVersion: globalThis.__harnessLoadedSdk?.version })`, returnByValue: true });
      observation.sdk = result.result.value;
      observation.sessionId = sessionId;
      expect(observation.sdk.version).toBe('6.0.3');
      expect(observation.sdk.observedVersion).toBe('6.0.3');
      expect(observation.sdk.moduleRestored).toBe(true);
    }
    return { sessionId, source, readyAtMs: await now() };
  }
  async function remaining(sessionId) {
    await h.edit(bad); await phase(sessionId, 'bad');
    await h.edit(valid); await phase(sessionId, 'restored');
  }
  async function change(fromSessionId, route) {
    const before = await snapshot();
    const startedAtMs = await now();
    await page.select('[aria-label="类型检查方式"]', route);
    const next = await initial(route);
    raw.switches.push({ fromSessionId, toSessionId: next.sessionId,
      startedAtMs, readyAtMs: next.readyAtMs, before, after: next.source });
    expect(next.source.text).toBe(before.text);
    await remaining(next.sessionId);
    return next.sessionId;
  }
  try {
    await h.edit(valid);
    await page.select('[aria-label="类型检查方式"]', 'browser-local');
    let current = (await initial('browser-local')).sessionId;
    await remaining(current);
    current = await change(current, 'backend-tnb');
    current = await change(current, 'browser-local');
    current = await change(current, 'backend-tnb');
    const source = await snapshot();
    const port = h.getBackend().port;
    await checkpoint('stopping-backend');
    await Promise.race([h.stopBackend(), new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('Real backend shutdown did not complete within ten seconds')), 10000);
      timer.unref();
    })]);
    await checkpoint('backend-stopped');
    await page.waitForSelector('[data-language-status="error"]');
    const outage = { sessionId: current, source, observations: [] };
    for (let index = 0; index < 2; index++) {
      await page.waitForFunction((id) => globalThis.webHarnessEvents.some(event => event.sessionId === id && event.kind === 'client-stopped'), {}, current);
      const state = await page.evaluate(() => ({ atMs: performance.timeOrigin + performance.now(),
        activeRoute: document.querySelector('[aria-label="类型检查方式"]').value,
        visibleError: document.querySelector('[data-language-status="error"]')?.textContent,
        diagnostics: globalThis.browserTestVscode.languages.getDiagnostics(globalThis.browserTestVscode.Uri.file('/workspace/example.gts')) }));
      expect(state.activeRoute).toBe('backend-tnb');
      expect(state.visibleError).toBeTruthy();
      expect(state.diagnostics).toHaveLength(0);
      expect((await snapshot()).text).toBe(source.text);
      outage.observations.push({ ...state, sessionId: current, sourceSha256: source.sha256 });
      await h.languageWorkers(0);
    }
    await h.startBackend(port);
    await checkpoint('backend-restarted');
    await page.click('.language-service-toolbar button');
    const next = await initial('backend-tnb');
    outage.reconnectedSessionId = next.sessionId;
    outage.reconnectedAtMs = next.readyAtMs;
    outage.reconnectedSource = next.source;
    raw.outages.push(outage);
    await remaining(next.sessionId);
    await h.languageWorkers(0);
    await h.sessions(1);
  } finally {
    await checkpoint('finalizing');
    await Promise.race([Promise.allSettled([...pending]), new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('Worker observation did not finish within ten seconds')), 10000);
      timer.unref();
    })]);
    raw.editorEvents = await page.evaluate(() => globalThis.webHarnessEvents);
    raw.completedAtMs = Date.now();
    await writeFile(path.join(directory, 'web-session-events.json'), JSON.stringify(raw, null, 2));
    await page.evaluate(() => globalThis.webHarnessSubscription.dispose());
    await cdp.send('Target.setAutoAttach', { autoAttach: false, waitForDebuggerOnStart: false, flatten: true });
    await cdp.detach();
  }
}
