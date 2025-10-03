class UpdateScheduler {
  timeoutId: number | null = null;

  scheduleUpdate(callback: Function) {
    if (this.timeoutId !== null) {
      cancelAnimationFrame(this.timeoutId);
    }

    this.timeoutId = requestAnimationFrame(() => {
      callback();
      this.timeoutId = null;
    });
  }

  // TO-DO Write a debounce function
}

export default UpdateScheduler;
