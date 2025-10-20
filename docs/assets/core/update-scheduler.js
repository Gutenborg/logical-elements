class UpdateScheduler {
    constructor() {
        Object.defineProperty(this, "timeoutId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        // TO-DO Write a debounce function
    }
    scheduleUpdate(callback) {
        if (this.timeoutId !== null) {
            cancelAnimationFrame(this.timeoutId);
        }
        this.timeoutId = requestAnimationFrame(() => {
            callback();
            this.timeoutId = null;
        });
    }
}
export default UpdateScheduler;
