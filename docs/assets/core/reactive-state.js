class ReactiveState {
    static isStateValue(fullPath) {
        if ((fullPath === null || fullPath === void 0 ? void 0 : fullPath.startsWith("{")) && (fullPath === null || fullPath === void 0 ? void 0 : fullPath.endsWith("}"))) {
            // Path is a state value lookup
            return true;
        }
        return false;
    }
    static parsePath(fullPath) {
        var _a;
        if (typeof fullPath !== "string" || !ReactiveState.isStateValue(fullPath)) {
            return { name: "", path: "" };
        }
        const splitPath = fullPath.slice(1, fullPath.length - 1).split(".");
        const name = (_a = splitPath.shift()) !== null && _a !== void 0 ? _a : "";
        const path = splitPath.join(".");
        return { name, path };
    }
    constructor(name) {
        Object.defineProperty(this, "_store", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this._createProxy({})
        });
        Object.defineProperty(this, "_subscribers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** This property allows us to provide the element that is requesting the state value to the derived function. This is helpful because it lets the elements communicate their current DOM state to the derived callback. */
        Object.defineProperty(this, "reader", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.name = name;
    }
    get store() {
        return this._store;
    }
    set store(newValue) {
        if (!this._canProxy) {
            console.warn("Invalid store value. Store must be either an object or an array.", newValue);
            return;
        }
        const proxiedValue = this._createProxy(newValue);
        this.notify("_store", proxiedValue, this._store);
        this._store = proxiedValue;
    }
    _canProxy(value) {
        if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
            return true;
        }
        return false;
    }
    _createProxyHandler(self = this) {
        return {
            get(target, property) {
                let value = target[property];
                // TO-DO: Figure out a better way to determine when to call derived values
                if (typeof value === "function" && value.name === "_deriveWrappedCallback") {
                    value = value();
                }
                return value;
            },
            set(target, property, newValue) {
                const previousValue = target[property];
                if (newValue === previousValue) {
                    // Values are equal and we don't need to set a new one
                    return true;
                }
                if (self._canProxy(newValue)) {
                    console.log("Need to create a new proxy");
                    // Value needs to be a proxy
                    target[property] = self._createProxy(newValue);
                }
                else {
                    target[property] = newValue;
                }
                // Announce the update
                self.notify(property, target[property], previousValue);
                return true;
            }
        };
    }
    _createProxy(stateStore = {}) {
        if (Array.isArray(stateStore)) {
            return new Proxy(stateStore, this._createProxyHandler());
        }
        const shallowClone = {};
        for (const property in stateStore) {
            if (this._canProxy(stateStore[property])) {
                shallowClone[property] = this._createProxy(stateStore[property]);
            }
            else {
                shallowClone[property] = stateStore[property];
            }
        }
        return new Proxy(shallowClone, this._createProxyHandler());
    }
    derive(callback) {
        if (typeof callback !== "function") {
            console.warn("No function to derive from, returning value as provided");
            return callback;
        }
        const _deriveWrappedCallback = () => {
            return callback.call(this, this._store, this.reader);
        };
        // Reset the reader
        this.reader = null;
        return _deriveWrappedCallback;
    }
    lookupValue(path) {
        const propertyMap = path.split(".");
        let propertyValue;
        if (propertyMap.length === 1) {
            // We can return the property directly
            propertyValue = this._store[propertyMap[0]];
        }
        else {
            // Navigate the object
            propertyValue = propertyMap.reduce((previous, current) => {
                if (previous[current] !== undefined) {
                    return previous[current];
                }
                return;
            }, this._store);
        }
        return propertyValue;
    }
    notify(property, newValue, previousValue) {
        for (const subscriber in this._subscribers) {
            this._subscribers[subscriber](property, previousValue, newValue);
        }
    }
    subscribe(callback) {
        let id = Object.keys(this._subscribers).length + 1;
        if (typeof callback !== "function") {
            console.warn("Subscriber is not callable", callback);
            return null;
        }
        this._subscribers[id] = callback;
        return id;
    }
    /** Removes an id from the subscriber list */
    unsubscribe(id) {
        // Check to see if there is a callback at this id
        if (id === undefined || id === null || this._subscribers[id] === undefined) {
            return false;
        }
        delete this._subscribers[id];
        return true;
    }
}
export default ReactiveState;
