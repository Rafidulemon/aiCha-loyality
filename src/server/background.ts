import 'server-only';
import { after } from 'next/server';
import { errorFields, log } from './log';

/**
 * Runs work after the response has been sent, so a slow side effect (a push to a phone) never makes the cashier wait, and keeps
 * the serverless function alive until it finishes. A failure is logged and goes no further: the request it belongs to has
 * already succeeded. Outside a request (scripts, tests) there is no "after", so the work simply starts.
 */
export function afterResponse(name: string, task: () => Promise<unknown>): void {
  const run = async () => {
    try {
      await task();
    } catch (e) {
      log.error('background.failed', { name, ...errorFields(e) });
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}
