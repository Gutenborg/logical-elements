import UpdateScheduler from "./update-scheduler";
import type { HTMLAttributeValue } from "./shared-types";
import LeContext from "../components/le-context";

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
    oldValue: HTMLAttributeValue,
    newValue: HTMLAttributeValue
  ): void;
  onChildrenModified(records: MutationRecord[]): void;
  onConnected?(): void;
  onDisconnected?(): void;
  onParsed?(): void;
  /** Called when either an `attribute-changed` or `children-modified` event occur. This callback
   * is debounced and will only trigger once even if multiple updates occur. */
  onUpdated?(): void;
}

// MARK: Event Types
interface AttributeChangedEventDetail {
  attribute: string;
  oldValue: HTMLAttributeValue;
  newValue: HTMLAttributeValue;
}

interface ChildrenModifiedEventDetail extends MutationRecord {}

interface LogicalElementEventMap {
  "le-attribute-changed": CustomEvent<AttributeChangedEventDetail>;
  "le-children-modified": CustomEvent<ChildrenModifiedEventDetail>;
  "le-connected": CustomEvent<null>;
  "le-disconnected": CustomEvent<null>;
  "le-parsed": CustomEvent<null>;
  "le-updated": CustomEvent<null>;
}

declare global {
  interface DocumentEventMap extends LogicalElementEventMap {}
}

class LogicalElement extends HTMLElement {
  // MARK: Properties
  private _childrenObserver: MutationObserver | null = null;
  private _updateScheduler = new UpdateScheduler();
  // private _attributeObserver: MutationObserver | null = null;

  public isParsed: boolean = false;
  public get contextProviders() {
    const providers: Record<string, LeContext> = {};

    // Find all parent context elements
    let provider = this.closest<LeContext>("le-context");

    while (provider !== null) {
      const providerNamespace = provider.getAttribute("namespace");

      if (typeof providerNamespace === "string") {
        providers[providerNamespace] = provider;
      }

      if (provider.parentElement !== null) {
        provider = provider.parentElement.closest<LeContext>("le-context");
      }
    }

    return providers;
  }

  // MARK: Constructor
  constructor() {
    super();

    //Set up attribute mutation observer
    this._childrenObserver = new MutationObserver(
      this.childrenModifiedCallback.bind(this)
    );

    // Set up attribute mutation observer
    // Not sure if this is needed
    /* this._attributeObserver = new MutationObserver(
      this.attributeChangedCallback,
    );

    this._attributeObserver?.observe(this, {
      attributeFilter: undefined,
      attributeOldValue: true,
      attributes: true,
    }); */

    this.addEventListener(
      "le-parsed",
      () => {
        // Once the element is parsed, we will observe for child mutation changes
        this._childrenObserver?.observe(this, {
          childList: true,
        });
      },
      { once: true }
    );
  }

  // MARK: Attribute Changed
  /** The default event options for the 'children-modified' custom event. Can be overwritten by the component author
   * @prop bubbles - Defaults to true
   * @prop cancelable - Defaults to true
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
    oldValue: HTMLAttributeValue,
    newValue: HTMLAttributeValue
  ) {
    if (!this.isParsed) {
      // These are initial attribute assignments, not changes
      return;
    }

    // Schedule the update lifecycle
    this._updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));

    if (typeof this.onAttributeChanged === "function") {
      // Perform component author logic
      this.onAttributeChanged(attribute, oldValue, newValue);
    }

    // Perform component consumer logic
    this.dispatchEvent(
      new CustomEvent("le-attribute-changed", {
        ...this.attributeChangedEventOptions,
        detail: { attribute, newValue, oldValue },
      })
    );
  }

  // Note sure if this is needed
  /* attributeMutatedCallback(records: MutationRecord[]) {
    for (const mutation of records) {
      const attribute = mutation.attributeName!;
      const newValue = this.getAttribute(attribute);
      const oldValue = mutation.oldValue;

      this.attributechangedCallback(attribute, oldValue, newValue);
    }
  } */

  // MARK: Connected
  /** The default event options for the 'connected' custom event. Can be overwritten by the component author
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

    // Check DOM state
    if (this.ownerDocument.readyState !== "complete") {
      // DOM is not loaded, so we check for it to load or for the children of the parent to change
      const handleReady = () => {
        // Cleanup
        observer.disconnect();
        this.removeEventListener("DOMContentLoaded", handleReady);

        // Check for parsed
        this.parsedCallback();
      };

      // Add event listener for when DOM is finished loading
      this.ownerDocument.addEventListener("DOMContentLoaded", handleReady);

      // Add a mutation observer to the parent to watch for changes
      const observer = new MutationObserver(handleReady);

      observer.observe(this.parentElement!, {
        childList: true,
        subtree: false,
      });
    } else {
      // DOM is loaded, go ahead and check for siblings
      this.parsedCallback();
    }
  }

  // MARK: Disconnected
  /** The default event options for the 'disconnected' custom event. Can be overwritten by the component author
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

  // MARK: Children Modified
  /** The default event options for the 'children-modified' custom event. Can be overwritten by the component author
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
    this._updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));

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

  // MARK: Parsed
  /** The default event options for the 'parsed' custom event. Can be overwritten by the component author
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
    // Schedule update callback
    this._updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));

    // Check if parsed
    let el: HTMLElement | ChildNode | ParentNode | null = this;

    // Work our way up the parent tree until we find a sibling node
    do {
      if (el.nextSibling || el.parentNode?.lastChild === el) {
        this.isParsed = true;
        break;
      }
    } while ((el = el.parentNode));

    // If we didn't find a sibling try again on the next step
    if (this.isParsed) {
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
    } else {
      // Potential for a loop, might want to add a protection to this
      requestAnimationFrame(this.parsedCallback);
    }
  }

  // MARK: Updated
  updatedCallback() {
    if (typeof this.onUpdated === "function") {
      this.onUpdated();
    }

    // Perform component consumer logic
    this.dispatchEvent(
      new CustomEvent("le-updated", {
        ...this.parsedEventOptions,
        detail: null,
      })
    );
  }
}

export default LogicalElement;
