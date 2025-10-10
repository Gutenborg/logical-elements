import UpdateScheduler from "./update-scheduler";
import type { HTMLAttributeValue } from "./shared-types";
import ContextElement, { StateUpdatedEventDetail } from "./context-element";
import { ReactiveState } from "./reactive-state";

interface LogicalElement extends HTMLElement {
  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: LogicalElement, event: HTMLMediaElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: (this: LogicalElement, event: Event) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener<K extends keyof LogicalElementEventMap>(
    type: K,
    listener: (this: LogicalElement, event: LogicalElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  onAttributeChanged?(
    attribute: string,
    previousValue: HTMLAttributeValue,
    newValue: HTMLAttributeValue
  ): void;
  onChildrenModified(records: MutationRecord[]): void;
  onConnected?(): void;
  onDisconnected?(): void;
  onParsed?(): void;
  onProviderUpdated?(property: string, previousValue: any, newValue: any): void;
  /** Called when either an `attribute-changed`, `children-modified`, or `parsed` event occur. This callback
   * is debounced and will only trigger once even if multiple updates occur. */
  onUpdated?(): void;
}

// MARK: Event Types
interface AttributeChangedEventDetail {
  attribute: string;
  previousValue: HTMLAttributeValue;
  newValue: HTMLAttributeValue;
}

interface ChildrenModifiedEventDetail extends MutationRecord {}

export interface LogicalElementEventMap {
  "le-attribute-changed": CustomEvent<AttributeChangedEventDetail>;
  "le-children-modified": CustomEvent<ChildrenModifiedEventDetail>;
  "le-connected": CustomEvent<null>;
  "le-disconnected": CustomEvent<null>;
  "le-parsed": CustomEvent<null>;
  "le-provider-updated": CustomEvent<StateUpdatedEventDetail[]>;
  "le-state-updated": CustomEvent<StateUpdatedEventDetail[]>;
  "le-updated": CustomEvent<null>;
}

interface ProviderSubscription {
  attribute: string;
  id: number;
}

declare global {
  interface DocumentEventMap extends LogicalElementEventMap {}
}

class LogicalElement extends HTMLElement {
  // MARK: Properties
  private _childrenObserver: MutationObserver | null = null;
  private _providerSubscriptions: ProviderSubscription[] = [];
  readonly updateScheduler = new UpdateScheduler();
  protected isParsed: boolean = false;
  public disableProviderUpdates = false;

  public get stateProviders() {
    const providers: Record<string, ReactiveState> = {};

    // Find all parent logical elements
    for (
      let parent: HTMLElement | null = this;
      parent !== null && parent !== document.body;
      parent = parent.parentElement
    ) {
      const parentName = parent.getAttribute("name");

      if (parent instanceof ContextElement && typeof parentName === "string") {
        providers[parentName] = parent.state;
      }
    }

    return providers;
  }

  // MARK: Attribute Changed
  /** The default event options for the 'le-attribute-changed' custom event. Can be overwritten by the component author
   * @prop bubbles - Defaults to false
   * @prop cancelable - Defaults to false
   * @prop composed - Defaults to false
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
   */
  public attributeChangedEventOptions: EventInit = {
    bubbles: false,
    cancelable: false,
    composed: false,
  };

  attributeChangedCallback(
    attribute: string,
    previousValue: HTMLAttributeValue,
    newValue: HTMLAttributeValue
  ) {
    // Handle state subscriptions
    if (ReactiveState.isStateValue(newValue)) {
      // Determine if we need to create a new subscription
      const { name: previousProvider } = ReactiveState.parsePath(previousValue);
      const { name: newProvider } = ReactiveState.parsePath(newValue);

      if (previousProvider !== newProvider) {
        // Cleanup old subscription if there is one
        const previousStateProvider = this.getStateProvider(previousValue);
        const subscriptionIndex = this._providerSubscriptions.findIndex(
          (subscription) => subscription.attribute === attribute
        );

        if (
          previousStateProvider instanceof ReactiveState &&
          subscriptionIndex >= 0
        ) {
          previousStateProvider.unsubscribe(subscriptionIndex);
        }

        // Create new subscription
        const stateProvider = this.stateProviders[newProvider];
        const subscriptionId = stateProvider?.subscribe(
          (property, propertyPreviousValue, propertyNewValue) => {
            this.providerUpdatedCallback(
              property,
              propertyPreviousValue,
              propertyNewValue
            );
          }
        );

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
    this.dispatchEvent(
      new CustomEvent<AttributeChangedEventDetail>("le-attribute-changed", {
        ...this.attributeChangedEventOptions,
        detail: { attribute, newValue, previousValue },
      })
    );
  }

  // MARK: Children Modified
  /** The default event options for the 'le-children-modified' custom event. Can be overwritten by the component author
   * @prop bubbles - Defaults to false
   * @prop cancelable - Defaults to false
   * @prop composed - Defaults to false
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
   */
  public childrenModifiedEventOptions: EventInit = {
    bubbles: false,
    cancelable: false,
    composed: false,
  };

  childrenModifiedCallback(records: MutationRecord[]) {
    // Schedule update callback
    this.updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));

    if (typeof this.onChildrenModified == "function") {
      // Perform component author logic
      this.onChildrenModified(records);
    }

    // Perform component consumer logic
    this.dispatchEvent(
      new CustomEvent("le-children-modified", {
        ...this.childrenModifiedEventOptions,
        detail: records,
      })
    );
  }

  // MARK: Connected
  /** The default event options for the 'le-connected' custom event. Can be overwritten by the component author
   * @prop bubbles - Defaults to true
   * @prop cancelable - Defaults to true
   * @prop composed - Defaults to false
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
   */
  public connectedEventOptions: EventInit = {
    bubbles: true,
    cancelable: true,
    composed: false,
  };

  connectedCallback() {
    // Run the user's connected logic
    if (typeof this.onConnected === "function") {
      // Perform component author logic
      this.onConnected();
    }

    // Perform component consumer logic
    this.dispatchEvent(
      new CustomEvent("le-connected", {
        ...this.connectedEventOptions,
        detail: null,
      })
    );

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

      observer.observe(this.parentElement!, {
        childList: true,
        subtree: false,
      });

      // Add event listener for when DOM is finished loading
      this.ownerDocument.addEventListener("DOMContentLoaded", handleReady);
    } else {
      // DOM is loaded, go ahead and check for siblings
      this.parsedCallback();
    }
  }

  // MARK: Disconnected
  /** The default event options for the 'le-disconnected' custom event. Can be overwritten by the component author
   * @prop bubbles - Defaults to true
   * @prop cancelable - Defaults to true
   * @prop composed - Defaults to false
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
   */
  public disconnectedEventOptions: EventInit = {
    bubbles: true,
    cancelable: true,
    composed: false,
  };

  disconnectedCallback() {
    if (typeof this.onDisconnected === "function") {
      // Perform component author logic
      this.onDisconnected();
    }

    // Perform component consumer logic
    this.dispatchEvent(
      new CustomEvent("le-disconnected", {
        ...this.attributeChangedEventOptions,
        detail: null,
      })
    );
  }

  // MARK: Parsed
  /** The default event options for the 'le-parsed' custom event. Can be overwritten by the component author
   * @prop bubbles - Defaults to false
   * @prop cancelable - Defaults to false
   * @prop composed - Defaults to false
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
   */
  public parsedEventOptions: EventInit = {
    bubbles: false,
    cancelable: false,
    composed: false,
  };

  parsedCallback() {
    // Schedule the update callback
    this.updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));

    // Check if element is parsed
    // Work our way up the parent tree looking for a sibling node
    for (
      let parent: HTMLElement | ParentNode | null = this;
      parent !== null;
      parent = parent.parentNode
    ) {
      if (
        parent.nextSibling !== null ||
        (parent.parentNode && parent.parentNode.lastChild === parent)
      ) {
        this.isParsed = true;
        break;
      }
    }

    if (this.isParsed) {
      // Get reactive children
      if (typeof this.onParsed === "function") {
        // Perform component author logic
        this.onParsed();
      }

      // Perform component consumer logic
      this.dispatchEvent(
        new CustomEvent("le-parsed", {
          ...this.parsedEventOptions,
          detail: null,
        })
      );

      // Set up the children mutation observer
      this._childrenObserver = new MutationObserver(
        this.childrenModifiedCallback.bind(this)
      );

      this._childrenObserver?.observe(this, {
        childList: true,
      });
    } else {
      // If we found a sibling try again on the next step
      // Potential for a loop, might want to add a protection to this
      requestAnimationFrame(this.parsedCallback);
    }
  }

  // MARK: Provider Updated
  /** The default event options for the 'le-parsed' custom event. Can be overwritten by the component author
   * @prop bubbles - Defaults to false
   * @prop cancelable - Defaults to false
   * @prop composed - Defaults to false
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
   */
  public providerUpdatedEventOptions: EventInit = {
    bubbles: false,
    cancelable: false,
    composed: false,
  };

  providerUpdatedCallback(property: string, previousValue: any, newValue: any) {
    if (!this.disableProviderUpdates) {
      this.updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));
    }

    if (typeof this.onProviderUpdated === "function") {
      this.onProviderUpdated(property, previousValue, newValue);
    }

    // Perform component consumer logic
    this.dispatchEvent(
      new CustomEvent("le-provider-updated", {
        ...this.updatedEventOptions,
        detail: {
          property,
          previousValue,
          newValue,
        },
      })
    );
  }

  // MARK: Updated
  /** The default event options for the 'le-parsed' custom event. Can be overwritten by the component author
   * @prop bubbles - Defaults to false
   * @prop cancelable - Defaults to false
   * @prop composed - Defaults to false
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
   */
  public updatedEventOptions: EventInit = {
    bubbles: true,
    cancelable: true,
    composed: false,
  };

  updatedCallback() {
    if (typeof this.onUpdated === "function") {
      this.onUpdated();
    }

    // Perform component consumer logic
    this.dispatchEvent(
      new CustomEvent("le-updated", {
        ...this.updatedEventOptions,
        detail: null,
      })
    );
  }

  // MARK: Utility Methods
  getAttributeFromState(attributeName: string) {
    const attributeValue = super.getAttribute(attributeName);

    if (!ReactiveState.isStateValue(attributeValue)) {
      return attributeValue;
    }

    // Value needs to be looked up in a state object
    const { name, path } = ReactiveState.parsePath(attributeValue);
    const stateValue = this.stateProviders[name]?.lookupValue(path);

    return stateValue;
  }

  getStateProvider(fullPath: string | null): ReactiveState | undefined {
    const { name } = ReactiveState.parsePath(fullPath);

    return this.stateProviders[name];
  }

  getStateValue(fullPath: string | null) {
    const { name, path } = ReactiveState.parsePath(fullPath);

    return this.stateProviders[name]?.lookupValue(path);
  }
}

export default LogicalElement;
