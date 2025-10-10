import LogicalElement, { LogicalElementEventMap, LogicalElementReactiveNamespaceMatch } from "./logical-element";
import { ReactiveState } from "./reactive-state";
import { HTMLAttributeValue } from "./shared-types";

export function convertToAttribute(value: any): HTMLAttributeValue {
    let convertedValue = null;
    
    if (typeof value === "string" || typeof value === "number") {
      convertedValue = String(value);
    } else if (typeof value === "boolean") {
      convertedValue = value ? "" : null;
    }
    
    return convertedValue;
  }

export function handleAttributes(element: HTMLElement,
    matches: LogicalElementReactiveNamespaceMatch[], instance: LogicalElement) {
    for (const match of matches) {
        let matchValue = match.value;

        if (ReactiveState.isStateValue(match.value)) {
            // Value is a context lookup and we need to fetch it
            matchValue = instance.getStateValue(match.value);
        }

        const convertedValue = convertToAttribute(matchValue);

        // TO-DO: Write a toAttribute converter
        switch (convertedValue) {
            case "false":
            case null:
            case "null":
                element.removeAttribute(match.localName);
                break;
            default:
                element.setAttribute(match.localName, convertedValue);
                break;
        }
    }
}

interface LogicalElementManagedHandlers {
    callback: EventListenerOrEventListenerObject;
    eventType: keyof ElementEventMap | keyof LogicalElementEventMap | string;
  }

export function handleListeners(element: HTMLElement,
    matches: LogicalElementReactiveNamespaceMatch[], instance: LogicalElement) {
        // Extend the instance to include a new property
        const extendedInstance = instance as LogicalElement & { managedListeners: WeakMap<HTMLElement, LogicalElementManagedHandlers[]>; };
    
        if (!(extendedInstance.managedListeners instanceof WeakMap)) {
            extendedInstance.managedListeners = new WeakMap();
        }

    // Compare the matches to the list of current handlers to determine if we need to remove any
    const elementHandlers = extendedInstance.managedListeners.get(element) ?? [];
    const assignedHandlers: LogicalElementManagedHandlers[] = [];

    for (const match of matches) {
        if (!match.value || !ReactiveState.isStateValue(match.value)) {
            // Value is not a context value and we cannot lookup the function to use as a handler
            console.warn(
                "Expected a state derived value, but instead received: ",
                match.value
            );
            return;
        }

        const handler = instance.getStateValue(match.value);

        if (
            typeof handler === "function" &&
            !elementHandlers.some((h) => h === handler)
        ) {
            // Add event listener
            element.addEventListener(match.localName, handler);
        }

        // Record that this handler was assigned
        assignedHandlers.push({ eventType: match.localName, callback: handler });
    }

    // Compare assigned handlers to current handlers and remove any abandoned handlers
    for (const handler of elementHandlers) {
        if (
            !assignedHandlers.some(
                (h) =>
                    h.callback === handler.callback && h.eventType === handler.eventType
            )
        ) {
            // Handle has been abandoned and should be removed
            element.removeEventListener(handler.eventType, handler.callback);
        }
    }

    // Update the list of managed handlers
    extendedInstance.managedListeners.set(element, assignedHandlers);
}

export function handleProperties(element: HTMLElement,
    matches: LogicalElementReactiveNamespaceMatch[], instance: LogicalElement) {
    for (const match of matches) {
        let matchValue: any = match.value;

        if (matchValue?.startsWith("{") && matchValue?.endsWith("}")) {
            // Value is a context lookup and we need to fetch it
            matchValue = instance.getStateValue(matchValue);
        }

        switch (match.localName) {
            case "text":
                element.textContent = matchValue;
                break;
            // case "template":
            // case "popover":
            default:
                break;
        }
    }
}