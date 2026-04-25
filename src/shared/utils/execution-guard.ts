/**
 * Execution guard – prevents overlapping long-running tasks.
 */

export class ExecutionGuard {
  private isRunning = false;
  private startTime: number | null = null;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    private readonly timeoutMs: number = 30 * 60 * 1000,
    private readonly onTimeout?: () => void
  ) {}

  isExecuting(): boolean {
    return this.isRunning;
  }

  getExecutionDuration(): number | null {
    if (!this.startTime) return null;
    return Date.now() - this.startTime;
  }

  acquire(): boolean {
    if (this.isRunning) return false;
    this.isRunning = true;
    this.startTime = Date.now();
    if (this.timeoutMs > 0) {
      this.timeoutId = setTimeout(() => {
        if (this.onTimeout) this.onTimeout();
        this.release();
      }, this.timeoutMs);
    }
    return true;
  }

  release(): void {
    this.isRunning = false;
    this.startTime = null;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.acquire()) throw new Error('Execution already in progress');
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
