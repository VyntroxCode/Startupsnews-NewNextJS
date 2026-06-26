/**
 * Morning Signal Job — thin wrapper around the shared service.
 * Actual logic lives in src/lib/morning-signal.service.ts.
 */

import { runMorningSignal, type MorningSignalResult } from '@/lib/morning-signal.service';

export class MorningSignalJob {
  async execute(options?: { bypassEnabledCheck?: boolean }): Promise<MorningSignalResult> {
    return runMorningSignal(options);
  }
}
