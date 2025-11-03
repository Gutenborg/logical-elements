import { LogicalElement, LogicalElementReactiveMatch } from "../";

export function reactiveSet(
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