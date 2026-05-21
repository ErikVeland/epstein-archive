export class WorkerPool {
  private readonly active = new Set<Promise<void>>();

  get size(): number {
    return this.active.size;
  }

  hasCapacity(concurrency: number): boolean {
    return this.active.size < concurrency;
  }

  run(task: () => Promise<void>): void {
    const promise = task().finally(() => {
      this.active.delete(promise);
    });

    this.active.add(promise);
  }

  async waitForNext(): Promise<void> {
    if (this.active.size === 0) return;
    await Promise.race(this.active);
  }

  async waitForCapacity(concurrency: number): Promise<void> {
    while (!this.hasCapacity(concurrency)) {
      await this.waitForNext();
    }
  }

  async drain(): Promise<void> {
    while (this.active.size > 0) {
      await this.waitForNext();
    }
  }
}
