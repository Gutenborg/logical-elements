import ReactiveState from "../reactive-state";
export function reactiveOn(matches, instance) {
    // Extend the instance to include a new property
    const extendedInstance = instance;
    if (extendedInstance.eventController instanceof AbortController) {
        extendedInstance.eventController.abort();
    }
    extendedInstance.eventController = new AbortController();
    for (const match of matches) {
        if (!match.value || !ReactiveState.isStateValue(match.value)) {
            // Value is not a context value and we cannot lookup the function to use as a handler
            continue;
        }
        // Compare the match to the list of current handlers to determine if we need to remove any
        const handler = instance.getStateValue(match.value, match.element);
        if (typeof handler === "function") {
            // Listener has not been added and needs to be
            match.element.addEventListener(match.localName, handler, {
                signal: extendedInstance.eventController.signal,
            });
        }
    }
}
