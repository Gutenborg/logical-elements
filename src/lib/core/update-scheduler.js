class UpdateScheduler {
  /** The id returned for the timeout, used to cancel the timeout as needed
   * @type {?number}
   */
  timeoutId = null;

  /** Creates a pending update that is cancelled if called again before the update resolves
   * @param {Function} callback
   */
  scheduleUpdate(callback) {
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
