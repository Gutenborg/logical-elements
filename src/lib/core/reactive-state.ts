export type StateStore = Record<string, any>;

export type ReactiveCallback = (property: string, newValue: any, previousValue: any) => void;

export class ReactiveState {
  public static isStateValue (fullPath: string | null) {
    if (fullPath?.startsWith("{") && fullPath?.endsWith("}")) {
      // Path is a state value lookup
      return true;
    }

      return false;
  }

  public static parsePath (fullPath: string | null) {
    if (typeof fullPath !== "string" || !ReactiveState.isStateValue(fullPath)) {
      return { name: "", path: "" };
    }

    const splitPath = fullPath.slice(1, fullPath.length - 1).split(".");
    const name = splitPath.shift() ?? "";
    const path = splitPath.join();

    return { name, path };
  }

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
      get(target, property: string) {
        let value = target[property];

        // TO-DO: Figure out a better way to determine when to call derived values
        if (typeof value === "function" && value.name === "wrappedCallback") {
          value = value(self._store);
        }

        return value;
      },
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

  public derive(callback: Function) {
    if (typeof callback !== "function") {
      console.warn("No function to derive from, returning value as provided");
      return callback;
    }

    const wrappedCallback = () => callback.call(this, this._store);
    
    return wrappedCallback;
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
      this._subscribers[subscriber](property, previousValue, newValue);
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
