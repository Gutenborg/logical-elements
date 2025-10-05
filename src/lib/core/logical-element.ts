import UpdateScheduler from "./update-scheduler";
import type { HTMLAttributeValue } from "./shared-types";
import { ReactiveState } from "./context";

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
  onStateUpdated?(property: string, previousValue: any, newValue: any): void;
  /** Called when either an `attribute-changed` or `children-modified` event occur. This callback
   * is debounced and will only trigger once even if multiple updates occur. */
  onUpdated?(): void;
}

// MARK: Event Types
interface AttributeChangedEventDetail {
  attribute: string;
  previousValue: HTMLAttributeValue;
  newValue: HTMLAttributeValue;
}

interface StateUpdatedEventDetail {
  property: string;
  previousValue: HTMLAttributeValue;
  newValue: HTMLAttributeValue;
}

interface ChildrenModifiedEventDetail extends MutationRecord { }

interface LogicalElementEventMap {
  "le-attribute-changed": CustomEvent<AttributeChangedEventDetail>;
  "le-children-modified": CustomEvent<ChildrenModifiedEventDetail>;
  "le-connected": CustomEvent<null>;
  "le-disconnected": CustomEvent<null>;
  "le-parsed": CustomEvent<null>;
  "le-state-updated": CustomEvent<StateUpdatedEventDetail[]>;
  "le-updated": CustomEvent<null>;
}

type LogicalElementDefaultReactiveNamespaces = "attr" | "on" | "prop";

type LogicalElementReactiveNamespaces = Record<LogicalElementDefaultReactiveNamespaces | string, LogicalElementReactiveHandler>;

interface LogicalElementReactiveNamespaceMatch {
  name: string;
  localName: string;
  value: HTMLAttributeValue;
}

type LogicalElementReactiveHandler = (element: HTMLElement, matches: LogicalElementReactiveNamespaceMatch[]) => void;

interface LogicalElementManagedHanders {
  callback: EventListenerOrEventListenerObject;
  eventType: keyof ElementEventMap | keyof LogicalElementEventMap | string;
}

declare global {
  interface DocumentEventMap extends LogicalElementEventMap { }
}

class LogicalElement extends HTMLElement {
  // MARK: Properties
  private _managedListeners = new WeakMap<HTMLElement, LogicalElementManagedHanders[]>();
  private _childrenObserver: MutationObserver | null = null;
  private _state = new ReactiveState();
  private _stateSubscriberId: number | null = null;
  private _updateScheduler = new UpdateScheduler();

  public get state() {
    return this._state;
  }

  // TO-DO: Set up the state property and add handlers for creating and reading state
  // TO-DO: Set up the reactivity of the state so that it triggers a new lifecycle event - DONE
  // TO-DO: Set up a 'le-state-updated' lifecycle event that also triggers the 'le-updated' lifecycle event - DONE
  // TO-DO: Set up a tool that locates all children with reactive attributes and applies any state updates to them
  // TO-DO: Set up a tool that locates all children with event binding attributes and creates event listeners for them
  // TO-DO: Set up something that makes sure to clean up after the event binding attributes and the created event listeners

  public isInitialized: boolean = false;
  public isParsed: boolean = false;

  public reactiveNamespaces: LogicalElementReactiveNamespaces = {
    attr: this.updateReactiveAttributes,
    on: this.updateReactiveListeners,
    set: this.updateReactiveProperties,
  }

  /** TO-DO: This needs to return a list of all parent Logical Elements, not just the le-context element
   * The goal here is to build the state/context feature directly
   * into the base class so that all children can access the state of any parent logical element
   */
  public get stateProviders() {
    const providers: Record<string, ReactiveState> = {};

    // Find all parent logical elements
    for (let parent: HTMLElement | null = this; parent !== null && parent !== document.body; parent = parent.parentElement) {
      const parentName = parent.getAttribute("name");

      if (parent instanceof LogicalElement && typeof parentName === "string") {
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
    if (!this.isParsed) {
      // These are initial attribute assignments, not changes
      return;
    }

    // Schedule the update lifecycle
    this._updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));

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

    // Subscribe to state updates
    this._stateSubscriberId = this.state.subscribe(this.stateUpdatedCallback.bind(this));

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

    this.state.unsubscribe(this._stateSubscriberId);
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
    this._updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));

    // Check if element is parsed
    // Work our way up the parent tree looking for a sibling node
    for (let parent: HTMLElement | ParentNode | ChildNode | null = this; parent !== null; parent = parent.parentNode) {
      if (parent.nextSibling || (parent.parentNode && parent.parentNode.lastChild === parent)) {
        this.isParsed = true;
        break;
      }
    }

    /* let el: HTMLElement | ChildNode | ParentNode | null = this;
    
    do {
      if (el.nextSibling || el.parentNode?.lastChild === el) {
        this.isParsed = true;
        break;
      }
    } while ((el = el.parentNode)); */

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

  stateUpdatedCallback(property: string, newValue: any, previousValue: any) {
    // Schedule the update callback
    this._updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));

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

  // MARK: Updated
  /** The default event options for the 'le-parsed' custom event. Can be overwritten by the component author
   * @prop bubbles - Defaults to false
   * @prop cancelable - Defaults to false
   * @prop composed - Defaults to false
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event#options
   */
  public updatedEventOptions: EventInit = {
    bubbles: false,
    cancelable: false,
    composed: false,
  };

  updatedCallback() {
    if (!this.isInitialized) {
      // The component is ready for reactivity and outside interactions
      this.isInitialized = true;
    }

    // TO-DO: Update reactive child attributes
    this.updateReactiveChildren();

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

  // MARK: Reactivity Methods
  convertToAttribute(value: any): HTMLAttributeValue {
    let convertedValue = null;

    if (typeof value === "string" || typeof value === "number") {
      convertedValue = String(value);
    } else if (typeof value === "boolean") {
      convertedValue = value ? "" : null;
    }

    return convertedValue;
  }
  
  getStateValue(path: string | null) {
    if (typeof path !== "string") {
      return;
    }

    const splitPath = path.slice(1, path.length - 1).split(".")
    const stateName = splitPath.shift() ?? "";

    return this.stateProviders[stateName]?.lookupValue(splitPath.join("."));
  }

  updateReactiveAttributes(element: HTMLElement, matches: LogicalElementReactiveNamespaceMatch[]) {
    for (const match of matches) {
      let matchValue = match.value;

      if (ReactiveState.isStateValue(match.value)) {
        // Value is a context lookup and we need to fetch it
        matchValue = this.getStateValue(match.value);
      }

      const convertedValue = this.convertToAttribute(matchValue);

      // TO-DO: Write a toAttribute converter
      switch (convertedValue) {
        case "false":
        case null:
        case "null":
          element.removeAttribute(match.localName);
          break;
        default:
          element.setAttribute(match.localName, convertedValue);
          break;
      }
    }
  }

  updateReactiveProperties(element: HTMLElement, matches: LogicalElementReactiveNamespaceMatch[]) {
    
    for (const match of matches) {
      let matchValue: any = match.value;
      
      if (matchValue?.startsWith("{") && matchValue?.endsWith("}")) {
        // Value is a context lookup and we need to fetch it
        const splitLookup = matchValue.slice(1, matchValue.length - 1).split(".");
        const stateName = splitLookup.shift() ?? "";
        
        matchValue = this.stateProviders[stateName]?.lookupValue(splitLookup.join("."));
      }

      console.log(element, this.stateProviders);
      
      switch (match.localName) {
        case "text":
          element.textContent = matchValue;
          break;
        // case "popover":
        default:
          break;
      }
    }
  }

  updateReactiveListeners(element: HTMLElement, matches: LogicalElementReactiveNamespaceMatch[]) {
    // Compare the matches to the list of current handlers to determine if we need to remove any
    const elementHandlers = this._managedListeners.get(element) ?? [];
    const assignedHandlers: LogicalElementManagedHanders[] = [];

    for (const match of matches) {
      if (!match.value || !match.value.startsWith("{") || !match.value?.endsWith("}")) {
        // Value is not a context value and we cannot lookup the function to use as a handler
        console.warn("Expected a state derived value, but instead received: ", match.value);
        return;
      }

      const splitLookup = match.value.slice(1, match.value.length - 1).split(".");
      const stateName = splitLookup.shift() ?? "";
      const handler = this.stateProviders[stateName]?.lookupValue(splitLookup.join("."));

      if (!elementHandlers.some((h) => h === handler) && typeof handler === "function") {
        // Add event listener
        element.addEventListener(match.localName, handler);
      }

      // Record that this handler was assigned
      assignedHandlers.push({ eventType: match.localName, callback: handler });
    }

    // Compare assigned handlers to current handlers and remove any abandoned handlers
    for(const handler of elementHandlers) {
      console.log("Removing abandoned handler!", handler);
      
      if (!assignedHandlers.some((h) => h.callback === handler.callback && h.eventType === handler.eventType)) {
        // Handle has been abandoned and should be removed
        element.removeEventListener(handler.eventType, handler.callback);
      }
    }

    // Update the list of managed handlers
    this._managedListeners.set(element, assignedHandlers);
  }

  updateReactiveChildren() {
    if (!this.isInitialized) {
      // Element is not ready for reactivity
      return;
    }

    
    // Create a treewalker to step through child nodes and find reactive children
    const treewalker = document.createTreeWalker(this, NodeFilter.SHOW_ELEMENT);
    let currentNode = treewalker.nextNode();
    
    // Loop through the children
    while (currentNode) {
      const element = currentNode as HTMLElement;
      
      if (element instanceof LogicalElement) {
        // CurrentNode is a logical element, tell it to handle updating its own children and skip it
        // This is needed because the current state may not contain all of the required values
        element.updateReactiveChildren();
        currentNode = treewalker.nextSibling();
      } else {
        // Navigate to the next node
        currentNode = treewalker.nextNode();
      }
      
      // Get attributes from element and look for our defined reactive attributes
      for (const namespace in this.reactiveNamespaces) {
        const matches = element.getAttributeNames().filter((attribute) => attribute.startsWith(`${namespace}:`));
        
        if (matches.length > 0) {
          const mappedMatches = matches.map((match) => {
            return {
              name: match,
              localName: match.split(":")[1],
              value: element.getAttribute(match),
            }
          });

          this.reactiveNamespaces[namespace].call(this, element, mappedMatches);
        }
      }
    }
  }
}

export default LogicalElement;
