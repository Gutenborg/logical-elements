import UpdateScheduler from "./update-scheduler";
import ContextElement from "./context-element";
import ReactiveState from "./reactive-state";
class LogicalElement extends HTMLElement {
    constructor() {
        super(...arguments);
        // MARK: Properties
        Object.defineProperty(this, "_childrenObserver", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_providerSubscriptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "updateScheduler", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new UpdateScheduler()
        });
        Object.defineProperty(this, "isParsed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "isInitialized", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "disableProviderUpdates", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "reactiveNamespaces", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        // MARK: Attribute Changed
        /** The default event options for the 'le-attribute-changed' custom event. Can be overwritten by the component author
         * @prop bubbles - Defaults to false
         * @prop cancelable - Defaults to false
         * @prop composed - Defaults to false
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
         */
        Object.defineProperty(this, "attributeChangedEventOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                bubbles: false,
                cancelable: false,
                composed: false,
            }
        });
        // MARK: Children Modified
        /** The default event options for the 'le-children-modified' custom event. Can be overwritten by the component author
         * @prop bubbles - Defaults to false
         * @prop cancelable - Defaults to false
         * @prop composed - Defaults to false
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
         */
        Object.defineProperty(this, "childrenModifiedEventOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                bubbles: false,
                cancelable: false,
                composed: false,
            }
        });
        // MARK: Connected
        /** The default event options for the 'le-connected' custom event. Can be overwritten by the component author
         * @prop bubbles - Defaults to true
         * @prop cancelable - Defaults to true
         * @prop composed - Defaults to false
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
         */
        Object.defineProperty(this, "connectedEventOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                bubbles: true,
                cancelable: true,
                composed: false,
            }
        });
        // MARK: Disconnected
        /** The default event options for the 'le-disconnected' custom event. Can be overwritten by the component author
         * @prop bubbles - Defaults to true
         * @prop cancelable - Defaults to true
         * @prop composed - Defaults to false
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
         */
        Object.defineProperty(this, "disconnectedEventOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                bubbles: true,
                cancelable: true,
                composed: false,
            }
        });
        // MARK: Parsed
        /** The default event options for the 'le-parsed' custom event. Can be overwritten by the component author
         * @prop bubbles - Defaults to false
         * @prop cancelable - Defaults to false
         * @prop composed - Defaults to false
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
         */
        Object.defineProperty(this, "parsedEventOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                bubbles: false,
                cancelable: false,
                composed: false,
            }
        });
        // MARK: Provider Updated
        /** The default event options for the 'le-provider-updated' custom event. Can be overwritten by the component author
         * @prop bubbles - Defaults to false
         * @prop cancelable - Defaults to false
         * @prop composed - Defaults to false
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
         */
        Object.defineProperty(this, "providerUpdatedEventOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                bubbles: false,
                cancelable: false,
                composed: false,
            }
        });
        // MARK: Updated
        /** The default event options for the 'le-parsed' custom event. Can be overwritten by the component author
         * @prop bubbles - Defaults to false
         * @prop cancelable - Defaults to false
         * @prop composed - Defaults to false
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
         */
        Object.defineProperty(this, "updatedEventOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                bubbles: true,
                cancelable: true,
                composed: false,
            }
        });
    }
    get stateProviders() {
        const providers = {};
        // Find all parent logical elements
        for (let parent = this; parent !== null && parent !== document.body; parent = parent.parentElement) {
            const parentName = parent.getAttribute("name");
            if (parent instanceof ContextElement && typeof parentName === "string") {
                providers[parentName] = parent.state;
            }
        }
        return providers;
    }
    attributeChangedCallback(attribute, previousValue, newValue) {
        // Handle state subscriptions
        if (ReactiveState.isStateValue(newValue)) {
            // Determine if we need to create a new subscription
            const { name: previousProvider } = ReactiveState.parsePath(previousValue);
            const { name: newProvider } = ReactiveState.parsePath(newValue);
            if (previousProvider !== newProvider) {
                // Cleanup old subscription if there is one
                const previousStateProvider = this.getStateProvider(previousValue);
                const subscriptionIndex = this._providerSubscriptions.findIndex((subscription) => subscription.attribute === attribute);
                if (previousStateProvider instanceof ReactiveState &&
                    subscriptionIndex >= 0) {
                    previousStateProvider.unsubscribe(subscriptionIndex);
                }
                // Create new subscription
                const stateProvider = this.stateProviders[newProvider];
                const subscriptionId = stateProvider === null || stateProvider === void 0 ? void 0 : stateProvider.subscribe((property, propertyPreviousValue, propertyNewValue) => {
                    this.providerUpdatedCallback(stateProvider.name, property, propertyPreviousValue, propertyNewValue);
                });
                if (typeof subscriptionId === "number") {
                    this._providerSubscriptions.push({ attribute, id: subscriptionId });
                }
            }
        }
        if (!this.isParsed) {
            // These are initial attribute assignments, not changes
            return;
        }
        // Schedule the update lifecycle
        this.updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));
        if (typeof this.onAttributeChanged === "function") {
            // Perform component author logic
            this.onAttributeChanged(attribute, previousValue, newValue);
        }
        // Perform component consumer logic
        this.dispatchEvent(new CustomEvent("le-attribute-changed", Object.assign(Object.assign({}, this.attributeChangedEventOptions), { detail: { attribute, newValue, previousValue } })));
    }
    childrenModifiedCallback(records) {
        // Schedule update callback
        this.updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));
        if (typeof this.onChildrenModified == "function") {
            // Perform component author logic
            this.onChildrenModified(records);
        }
        // Perform component consumer logic
        this.dispatchEvent(new CustomEvent("le-children-modified", Object.assign(Object.assign({}, this.childrenModifiedEventOptions), { detail: records })));
    }
    connectedCallback() {
        // Run the user's connected logic
        if (typeof this.onConnected === "function") {
            // Perform component author logic
            this.onConnected();
        }
        // Perform component consumer logic
        this.dispatchEvent(new CustomEvent("le-connected", Object.assign(Object.assign({}, this.connectedEventOptions), { detail: null })));
        // Set up the element to determine when it is parsed by checking the DOM state
        if (this.ownerDocument.readyState !== "complete") {
            // DOM is not completely loaded yet
            const handleReady = () => {
                // Disconnect the observer and remove the event listener
                observer.disconnect();
                this.removeEventListener("DOMContentLoaded", handleReady);
                // We cn now check to see if the element is parsed
                this.parsedCallback();
            };
            // Add a mutation observer to the parent to watch for changes
            const observer = new MutationObserver(handleReady);
            observer.observe(this.parentElement, {
                childList: true,
                subtree: false,
            });
            // Add event listener for when DOM is finished loading
            this.ownerDocument.addEventListener("DOMContentLoaded", handleReady);
        }
        else {
            // DOM is loaded, go ahead and check for siblings
            this.parsedCallback();
        }
    }
    disconnectedCallback() {
        if (typeof this.onDisconnected === "function") {
            // Perform component author logic
            this.onDisconnected();
        }
        // Perform component consumer logic
        this.dispatchEvent(new CustomEvent("le-disconnected", Object.assign(Object.assign({}, this.attributeChangedEventOptions), { detail: null })));
    }
    parsedCallback() {
        var _a;
        // Check if element is parsed
        // Work our way up the parent tree looking for a sibling node
        for (let parent = this; parent !== null; parent = parent.parentNode) {
            if (parent.nextSibling !== null ||
                (parent.parentNode && parent.parentNode.lastChild === parent)) {
                this.isParsed = true;
                break;
            }
        }
        if (this.isParsed) {
            // Schedule the update callback
            this.updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));
            // Perform component author logic
            if (typeof this.onParsed === "function") {
                this.onParsed();
            }
            // Perform component consumer logic
            this.dispatchEvent(new CustomEvent("le-parsed", Object.assign(Object.assign({}, this.parsedEventOptions), { detail: null })));
            // Set up the children mutation observer
            this._childrenObserver = new MutationObserver(this.childrenModifiedCallback.bind(this));
            (_a = this._childrenObserver) === null || _a === void 0 ? void 0 : _a.observe(this, {
                childList: true,
            });
        }
        else {
            // If we found a sibling try again on the next step
            // Potential for a loop, might want to add a protection to this
            requestAnimationFrame(this.parsedCallback);
        }
    }
    providerUpdatedCallback(provider, property, previousValue, newValue) {
        if (!this.disableProviderUpdates) {
            this.updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));
        }
        if (typeof this.onProviderUpdated === "function") {
            this.onProviderUpdated(provider, property, previousValue, newValue);
        }
        // Perform component consumer logic
        this.dispatchEvent(new CustomEvent("le-provider-updated", Object.assign(Object.assign({}, this.updatedEventOptions), { detail: {
                provider,
                property,
                previousValue,
                newValue,
            } })));
    }
    updatedCallback() {
        if (typeof this.onBeforeUpdated === "function") {
            this.onBeforeUpdated();
        }
        // Component is ready for reactivity
        if (!this.isInitialized) {
            this.isInitialized = true;
        }
        this.handleReactiveNamespaces();
        if (typeof this.onUpdated === "function") {
            this.onUpdated();
        }
        // Perform component consumer logic
        this.dispatchEvent(new CustomEvent("le-updated", Object.assign(Object.assign({}, this.updatedEventOptions), { detail: null })));
    }
    // MARK: Utility Methods
    eachChild(callback, node = this) {
        if (typeof callback !== "function") {
            // No action to take
            return;
        }
        // Create a treewalker to step through child nodes and find reactive children
        const treewalker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
        let currentNode = treewalker.nextNode();
        // Loop through the children
        while (currentNode) {
            const currentElement = currentNode;
            const nextNode = callback(currentElement, treewalker);
            if (nextNode === undefined) {
                currentNode = treewalker.nextNode();
            }
            else {
                currentNode = nextNode;
            }
        }
    }
    getStateFromAttribute(attributeName, reader = null) {
        const attributeValue = super.getAttribute(attributeName);
        if (!ReactiveState.isStateValue(attributeValue)) {
            return attributeValue;
        }
        return this.getStateValue(attributeValue, reader);
    }
    getStateProvider(fullPath) {
        const { name } = ReactiveState.parsePath(fullPath);
        return this.stateProviders[name];
    }
    getStateValue(fullPath, reader = null) {
        const { name, path } = ReactiveState.parsePath(fullPath);
        const stateProvider = this.stateProviders[name];
        if (!(stateProvider instanceof ReactiveState)) {
            // There is no value to look up;
            return;
        }
        // Set the reader element
        stateProvider.reader = reader;
        return stateProvider.lookupValue(path);
    }
    handleReactiveNamespaces() {
        if (!this.isParsed || !this.isInitialized) {
            return;
        }
        let matchMap = new Map();
        this.eachChild((currentElement, treewalker) => {
            if (currentElement instanceof ContextElement) {
                // CurrentNode is a context element, tell it to handle updating its own children and then skip over it
                // This is needed because the current context may not contain values required by children of another context
                currentElement.handleReactiveNamespaces();
                return treewalker.nextSibling();
            }
            for (const [namespace, handler] of this.reactiveNamespaces) {
                if (typeof handler !== "function") {
                    // Nothing to pass matches to
                    continue;
                }
                const matches = currentElement
                    .getAttributeNames()
                    .filter((attribute) => attribute.startsWith(`${namespace}:`));
                // Get attributes from element and look for our defined reactive attributes
                if (matches.length > 0) {
                    const mappedMatches = matches.map((match) => {
                        return {
                            element: currentElement,
                            name: match,
                            localName: match.split(":")[1],
                            value: currentElement.getAttribute(match),
                        };
                    });
                    if (matchMap.has(handler) && Array.isArray(matchMap.get(handler))) {
                        const currentMatches = matchMap.get(handler);
                        matchMap.set(handler, currentMatches.concat(mappedMatches));
                    }
                    else {
                        matchMap.set(handler, mappedMatches);
                    }
                }
            }
        });
        for (const [handler, matches] of matchMap) {
            handler.call(this, matches, this);
        }
    }
}
export default LogicalElement;
