import LogicalElement from "./logical-element";
import { ReactiveState } from "./reactive-state";
import { HTMLAttributeValue } from "./shared-types";
import {
  reactiveAttr,
  reactiveOn,
  reactiveSet,
} from "./reactive-handlers";

interface ContextElement {
  onStateUpdated?(property: string, previousValue: any, newValue: any): void;
}

export interface StateUpdatedEventDetail {
  property: string;
  previousValue: HTMLAttributeValue;
  newValue: HTMLAttributeValue;
}

/** Provides an element that has a state and allows you to place a state-defining script within it */
class ContextElement extends LogicalElement {
  // MARK: Properties
  private _state = new ReactiveState(this._stateName);
  private _stateSubscriberId: number | null = null;

  private get _stateName () {
    return this.getAttribute("name") ?? this.getAttribute("id") ?? window.crypto.randomUUID();
  }

  public get state() {
    return this._state;
  }

  // MARK: Connected
  connectedCallback() {
    // Subscribe to state updates
    this._stateSubscriberId = this.state.subscribe(
      this.stateUpdatedCallback.bind(this)
    );

    // Add reactive namespaces that interact with state
    this.reactiveNamespaces.set("attr", reactiveAttr);
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

  // MARK: State Updated
  /** The default event options for the 'le-state-updated' custom event. Can be overwritten by the component author
   * @prop bubbles - Defaults to false
   * @prop cancelable - Defaults to false
   * @prop composed - Defaults to false
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
   */
  public stateUpdatedEventOptions: EventInit = {
    bubbles: false,
    cancelable: false,
    composed: false,
  };

  stateUpdatedCallback(property: string, previousValue: any, newValue: any) {
    // Schedule the update callback
    this.updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));

    if (typeof this.onStateUpdated === "function") {
      // Perform component author logic
      this.onStateUpdated(property, previousValue, newValue);
    }

    // Perform component consumer logic
    this.dispatchEvent(
      new CustomEvent<StateUpdatedEventDetail>("le-state-updated", {
        ...this.stateUpdatedEventOptions,
        detail: {
          property,
          newValue,
          previousValue,
        },
      })
    );
  }
}

export default ContextElement;
