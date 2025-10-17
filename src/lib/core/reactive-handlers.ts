import LogicalElement, { LogicalElementReactiveMatch } from "./logical-element";
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

export function handleEventTest(matches: LogicalElementReactiveMatch[], logicalParent: LogicalElement) {

}

export function handleAttributes(
  matches: LogicalElementReactiveMatch[],
  instance: LogicalElement
) {
  for (const match of matches) {
    let matchValue = match.value;

    if (ReactiveState.isStateValue(match.value)) {
      // Value is a context lookup and we need to fetch it
      matchValue = instance.getStateValue(match.value, match.element);
    }

    const convertedValue = convertToAttribute(matchValue);

    // TO-DO: Write a toAttribute converter
    switch (convertedValue) {
      case "false":
      case null:
      case "null":
        match.element.removeAttribute(match.localName);
        break;
      default:
        match.element.setAttribute(match.localName, convertedValue);
        break;
    }
  }
}

export function handleListeners(
  matches: LogicalElementReactiveMatch[],
  instance: LogicalElement
) {
  // Extend the instance to include a new property
  const extendedInstance = instance as LogicalElement & {
    eventController: AbortController;
  };

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

export function handleProperties(
  matches: LogicalElementReactiveMatch[],
  instance: LogicalElement
) {
  for (const match of matches) {
    let matchValue: any = match.value;

    if (matchValue?.startsWith("{") && matchValue?.endsWith("}")) {
      // Value is a context lookup and we need to fetch it
      matchValue = instance.getStateValue(matchValue, match.element);
    }

    switch (match.localName) {
      case "text":
        match.element.textContent = matchValue;
        break;
      // case "template":
      // case "popover":
      default:
        break;
    }
  }
}
