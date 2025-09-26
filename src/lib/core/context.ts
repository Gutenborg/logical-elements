declare global {
  interface Window {
    le?: LogicalElementGlobal;
  }
}

interface LogicalElementGlobal {
  context: Record<string, ContextStore>;
}

export type ContextObject = Record<string, ContextValue>;

type ContextValue = string | number | boolean | Array<ContextValue> | null;

export type ContextUpdatedEventDetail = {
  property: string | null;
  newValue: ContextValue;
  oldValue: ContextValue;
} | null;

export class ContextStore {
  store: ContextObject;

  constructor(context: ContextObject, subscriber: Element) {
    const proxyHandler: ProxyHandler<ContextObject> = {
      set(target: ContextObject, property: string, newValue: ContextValue) {
        const oldValue = target[property];

        // Assign the new value
        target[property] = newValue;

        // Dispatch context update event
        const contextUpdateEvent = new CustomEvent<ContextUpdatedEventDetail>(
          "le-context-updated",
          {
            bubbles: false,
            cancelable: false,
            composed: false,
            detail: {
              property,
              newValue,
              oldValue,
            },
          }
        );

        subscriber.dispatchEvent(contextUpdateEvent);

        return true;
      },
    };

    this.store = new Proxy(context, proxyHandler);
  }
}

export function isContext(lookupString?: string | null) {
  if (typeof lookupString !== "string" || !lookupString.startsWith("$")) {
    // Does not start with a context symbol
    return false;
  }

  const splitString = lookupString.split(".");

  if (splitString.length <= 1) {
    // Does not contain any property name to lookup
    return false;
  }

  return true;
}

export function getContextNamespace(lookupString?: string | null) {
  if (!isContext(lookupString)) {
    return null;
  }

  const splitString = lookupString!.split(".");

  return splitString[0].slice(1);
}

export function lookupProperty(path: string, target: Record<string, any>) {
  const propertyMap = path.split(".");

  // Remove the namespace
  if (propertyMap[0].startsWith("$")) {
    propertyMap.splice(0, 1);
  }

  if (propertyMap.length === 1) {
    // We can return the property directly
    return target[propertyMap[0]];
  }

  // Navigate the object
  const propertyValue = propertyMap.reduce((previous, current) => {
    if (previous[current] !== undefined) {
      return previous[current];
    }

    return;
  }, target);

  return propertyValue;
}
