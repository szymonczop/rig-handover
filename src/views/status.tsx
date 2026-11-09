import type { NightCounts } from '../digest/counts.js';
import type { Status } from '../status.js';

function countsText(c: NightCounts | null | undefined): string {
  if (!c) return ' · —';
  return ` · ok ${c.ok} · retry ${c.retry} · fail ${c.fail}` + (c.bad > 0 ? ` · bad ${c.bad}` : '');
}

export function StatusBoard({ status }: { status: Status }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <ul>
          {status.nights.map((n) => (
            <li>
              <a href={`/digest/${n}`}>{n}</a>
              {countsText(status.counts[n])}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
