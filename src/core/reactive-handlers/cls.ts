import { LogicalElement, LogicalElementReactiveMatch } from "../";
import ReactiveState from "../reactive-state";

export function reactiveCls(
    matches: LogicalElementReactiveMatch[],
    instance: LogicalElement
  ) {
    for (const match of matches) {
      let matchValue = match.value;
  
      if (ReactiveState.isStateValue(match.value)) {
        // Value is a context lookup and we need to fetch it
        matchValue = instance.getStateValue(match.value, match.element);
      }

      const splitClasses = match.localName.split("|");

      if (!!matchValue) {
        match.element.classList.add(...splitClasses);
      } else {
        match.element.classList.remove(...splitClasses);
      }
    }
  }