// Plan morning-digest § 2c. Counts run-log lines per status for one night.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './reader.js';

export type NightCounts = { ok: number; retry: number; fail: number; bad: number };

/** Lines per status for runs/<night>.jsonl; bad lines counted apart. Null when no file. */
export function countNight(runsDir: string, night: string): NightCounts | null {
  const file = join(runsDir, `${night}.jsonl`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night) || !existsSync(file)) return null;
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0, bad: 0 };
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line === null) counts.bad++;
    else counts[line.status]++;
  }
  return counts;
}
