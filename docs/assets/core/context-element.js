import LogicalElement from "./logical-element";
import ReactiveState from "./reactive-state";
import { reactiveAttr, reactiveOn, reactiveSet, } from "./reactive-handlers";
import { reactiveCls } from "./reactive-handlers/cls";
/** Provides an element that has a state and allows you to place a state-defining script within it */
class ContextElement extends LogicalElement {
    constructor() {
        super(...arguments);
        // MARK: Properties
        Object.defineProperty(this, "_state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new ReactiveState(this._stateName)
        });
        Object.defineProperty(this, "_stateSubscriberId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        // MARK: State Updated
        /** The default event options for the 'le-state-updated' custom event. Can be overwritten by the component author
         * @prop bubbles - Defaults to false
         * @prop cancelable - Defaults to false
         * @prop composed - Defaults to false
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
         */
        Object.defineProperty(this, "stateUpdatedEventOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                bubbles: false,
                cancelable: false,
                composed: false,
            }
        });
    }
    get _stateName() {
        var _a, _b;
        return (_b = (_a = this.getAttribute("name")) !== null && _a !== void 0 ? _a : this.getAttribute("id")) !== null && _b !== void 0 ? _b : window.crypto.randomUUID();
    }
    get state() {
        return this._state;
    }
    // MARK: Connected
    connectedCallback() {
        // Subscribe to state updates
        this._stateSubscriberId = this.state.subscribe(this.stateUpdatedCallback.bind(this));
        // Add reactive namespaces that interact with state
        this.reactiveNamespaces.set("attr", reactiveAttr);
        this.reactiveNamespaces.set("cls", reactiveCls);
        this.reactiveNamespaces.set("on", reactiveOn);
        this.reactiveNamespaces.set("set", reactiveSet);
        super.connectedCallback();
    }
    // MARK: Disconnected
    disconnectedCallback() {
        // Unsubscribe from state updates
        this.state.unsubscribe(this._stateSubscriberId);
        super.disconnectedCallback();
    }
    stateUpdatedCallback(property, previousValue, newValue) {
        // Schedule the update callback
        this.updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));
        if (typeof this.onStateUpdated === "function") {
            // Perform component author logic
            this.onStateUpdated(property, previousValue, newValue);
        }
        // Perform component consumer logic
        this.dispatchEvent(new CustomEvent("le-state-updated", Object.assign(Object.assign({}, this.stateUpdatedEventOptions), { detail: {
                property,
                newValue,
                previousValue,
            } })));
    }
}
export default ContextElement;
