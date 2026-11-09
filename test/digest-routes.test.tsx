import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const JOBS_1028 = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

const LINES_1102 = [
  '{"at":"2026-11-02T09:00:00+01:00","job":"b/job","status":"ok","owner":"rook"}',
  '{"at":"2026-11-02T09:05:00+01:00","job":"a/job","status":"retry","owner":"rook","error":"boom"}',
  '{"at":',
].join('\n') + '\n';

/** Index of each job's first occurrence in the html; fails the test when one is missing. */
function positions(html: string, jobs: readonly string[]): number[] {
  return jobs.map((job) => {
    const at = html.indexOf(job);
    expect(at, `html should contain ${job}`).toBeGreaterThanOrEqual(0);
    return at;
  });
}

describe('digest routes', () => {
  let runsDir: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    runsDir = mkdtempSync(join(tmpdir(), 'digest-routes-'));
    copyFileSync(
      fileURLToPath(new URL('../runs/2026-10-28.jsonl', import.meta.url)),
      join(runsDir, '2026-10-28.jsonl'),
    );
    writeFileSync(join(runsDir, '2026-11-01.jsonl'), '');
    writeFileSync(join(runsDir, '2026-11-02.jsonl'), LINES_1102);

    app = createApp({
      adapter: 'shim',
      installed: '2026-10-29T14:06:00+01:00',
      beatEverySeconds: 60,
      runsDir,
    });
  });

  afterAll(() => {
    rmSync(runsDir, { recursive: true, force: true });
  });

  describe('night with a bad line (2026-10-28)', () => {
    it('GET /digest/2026-10-28 lists the 5 jobs in order, with a — for the null owner', async () => {
      const res = await app.request('/digest/2026-10-28');
      const html = await res.text();
      expect(res.status).toBe(200);
      const at = positions(html, JOBS_1028);
      expect([...at].sort((a, b) => a - b)).toEqual(at);
      expect(html).toContain('—');
    });

    it('GET /api/digest/2026-10-28 returns 1 bad line and the 5 jobs in order', async () => {
      const res = await app.request('/api/digest/2026-10-28');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Night;
      expect(body.badLines).toBe(1);
      expect(body.rows.map((r) => r.job)).toEqual(JOBS_1028);
    });

    it('page and JSON list the jobs in the same order', async () => {
      const html = await (await app.request('/digest/2026-10-28')).text();
      const body = (await (await app.request('/api/digest/2026-10-28')).json()) as Night;
      const at = positions(
        html,
        body.rows.map((r) => r.job),
      );
      expect([...at].sort((a, b) => a - b)).toEqual(at);
    });
  });

  describe('night with no file (2026-12-31)', () => {
    it('GET /digest/2026-12-31 is 404', async () => {
      expect((await app.request('/digest/2026-12-31')).status).toBe(404);
    });

    it('GET /api/digest/2026-12-31 is 404', async () => {
      expect((await app.request('/api/digest/2026-12-31')).status).toBe(404);
    });
  });

  describe('empty night (2026-11-01)', () => {
    it('GET /digest/2026-11-01 is 200 and says nothing ran', async () => {
      const res = await app.request('/digest/2026-11-01');
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('nothing ran');
    });

    it('GET /api/digest/2026-11-01 is 200 with no rows', async () => {
      const res = await app.request('/api/digest/2026-11-01');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Night;
      expect(body.rows).toEqual([]);
    });
  });

  describe('night with a bad line and two jobs (2026-11-02)', () => {
    it('GET /digest/2026-11-02 lists a/job before b/job', async () => {
      const res = await app.request('/digest/2026-11-02');
      expect(res.status).toBe(200);
      const [a, b] = positions(await res.text(), ['a/job', 'b/job']);
      expect(a).toBeLessThan(b);
    });

    it('GET /api/digest/2026-11-02 counts 1 bad line and sorts rows by job', async () => {
      const res = await app.request('/api/digest/2026-11-02');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Night;
      expect(body.badLines).toBe(1);
      expect(body.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
    });
  });
});
