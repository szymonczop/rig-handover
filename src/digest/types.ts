// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One line of runs/<night>.jsonl, once parsed. */
export type RunLine = {
  at: string; // ISO 8601 with the log's offset; never converted to UTC
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

/** One row per job for a night. */
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as `—`
  runs: number; // lines for this job
  retries: number; // lines with status `retry`
  lastStatus: RunStatus;
  lastError: string | null; // error of the last line that had one
  firstAt: string; // `at` of the first line, offset kept
  lastAt: string; // `at` of the last line, offset kept
};

/** A night read from disk. Rows are sorted by job. */
export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[];
  badLines: number; // lines that did not parse; counted, never thrown
};

/**
 * Reads runs/<night>.jsonl. Returns null when the file does not exist (route: 404).
 * An empty file gives `rows: []` (page: "nothing ran"). Implemented in src/digest/reader.ts.
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;
