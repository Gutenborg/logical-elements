import LogicalElement, { LogicalElementReactiveMatch } from "../logical-element";
import ReactiveState from "../reactive-state";
import { HTMLAttributeValue } from "../shared-types";

export function convertToAttribute(value: any): HTMLAttributeValue {
    let convertedValue = null;
  
    if (typeof value === "string" || typeof value === "number") {
      convertedValue = String(value);
    } else if (typeof value === "boolean") {
      convertedValue = value ? "" : null;
    }
  
    return convertedValue;
  }

export function reactiveAttr(
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