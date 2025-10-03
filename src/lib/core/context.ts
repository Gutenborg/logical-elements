export class ReactiveState {
  private _store: StateStore = this._createProxy({});
  private _subscribers: Record<number, ReactiveCallback> = {};

  public get store () {
    return this._store;
  }

  public set store (newValue: StateStore) {
    if (!this._canProxy) {
      console.warn("Invalid store value. Store must be either an object or an array.", newValue);
      return;
    }
    
    const proxiedValue = this._createProxy(newValue);
    this.notify("_store", proxiedValue, this._store);
    this._store = proxiedValue;
  }

  private _canProxy (value?: any) {
    if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
      return true;
    }

    return false;
  }

  private _createProxyHandler (self = this): ProxyHandler<StateStore> {
    return {
      set(target, property: string, newValue) {
        const previousValue = target[property];
        
        if (newValue === previousValue) {
          // Values are equal and we don't need to set a new one
          return true;
        }

        if (self._canProxy(newValue)) {
          console.log("Need to create a new proxy");
          
          // Value needs to be a proxy
          target[property] = self._createProxy(newValue);
        } else {
          target[property] = newValue;
        }
        
        // Announce the update
        self.notify(property, target[property], previousValue);

        return true;
      }
    }
  }

  private _createProxy (stateStore: StateStore = {}) {
    if (Array.isArray(stateStore)) {
      return new Proxy(stateStore, this._createProxyHandler());
    }

    const shallowClone: StateStore = {};
    
    for(const property in stateStore) {
      if (this._canProxy(stateStore[property])) {
        shallowClone[property] = this._createProxy(stateStore[property]);
      } else {
        shallowClone[property] = stateStore[property];
      }
    }

    return new Proxy(shallowClone, this._createProxyHandler());
  }

  public lookupValue(path: string) {
    const propertyMap = path.split(".");
  
    // Remove the namespace
    if (propertyMap[0].startsWith("$")) {
      propertyMap.splice(0, 1);
    }
  
    if (propertyMap.length === 1) {
      // We can return the property directly
      return this._store[propertyMap[0]];
    }
  
    // Navigate the object
    const propertyValue = propertyMap.reduce((previous, current) => {
      if (previous[current] !== undefined) {
        return previous[current];
      }
  
      return;
    }, this._store);
  
    return propertyValue;
  }

  public notify (property: string, newValue: any, previousValue: any) {
    for(const subscriber in this._subscribers) {
      this._subscribers[subscriber](property, newValue, previousValue);
    }
  }

  public subscribe (callback: ReactiveCallback) {
    let id = Object.keys(this._subscribers).length + 1;

    if (typeof callback !== "function") {
      console.warn("Subscriber is not callable", callback);
      return null;
    }
    
    this._subscribers[id] = callback;
    return id;
  }

  /** Removes an id from the subscriber list */
  public unsubscribe (id?: number | null) {
    // Check to see if there is a callback at this id
    if (id === undefined || id === null || this._subscribers[id] === undefined) {
      return false;
    }
    
    delete this._subscribers[id];
    return true;
  }
}

export type StateStore = Record<string, any>;

export type ReactiveCallback = (property: string, newValue: any, previousValue: any) => void;

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
