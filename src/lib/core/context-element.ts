import LogicalElement from "./logical-element";
import { ReactiveState } from "./reactive-state";
import { LogicalElementEventMap } from "./logical-element";
import { HTMLAttributeValue } from "./shared-types";

interface ContextElement {
  onStateUpdated?(property: string, previousValue: any, newValue: any): void;
}

interface LogicalElementManagedHanders {
  callback: EventListenerOrEventListenerObject;
  eventType: keyof ElementEventMap | keyof LogicalElementEventMap | string;
}

export interface StateUpdatedEventDetail {
  property: string;
  previousValue: HTMLAttributeValue;
  newValue: HTMLAttributeValue;
}

type LogicalElementDefaultReactiveNamespaces = "attr" | "on" | "set";

type LogicalElementReactiveNamespaces = Record<
  LogicalElementDefaultReactiveNamespaces | string,
  LogicalElementReactiveHandler
>;

type LogicalElementReactiveHandler = (
  element: HTMLElement,
  matches: LogicalElementReactiveNamespaceMatch[]
) => void;

interface LogicalElementReactiveNamespaceMatch {
  name: string;
  localName: string;
  value: HTMLAttributeValue;
}

/** Provides an element that has a state and allows you to place a state-defining script within it */
class ContextElement extends LogicalElement {
  // MARK: Properties
  private _managedListeners = new WeakMap<
    HTMLElement,
    LogicalElementManagedHanders[]
  >();
  private _state = new ReactiveState();
  private _stateSubscriberId: number | null = null;

  public get state() {
    return this._state;
  }

  public isInitialized: boolean = false;

  public reactiveNamespaces: LogicalElementReactiveNamespaces = {
    attr: this.updateReactiveAttributes,
    on: this.updateReactiveListeners,
    set: this.updateReactiveProperties,
  };

  connectedCallback() {
    this._stateSubscriberId = this.state.subscribe(
      this.stateUpdatedCallback.bind(this)
    );

    super.connectedCallback();
  }

  disconnectedCallback() {
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

    super.updatedCallback();
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

  updateReactiveAttributes(
    element: HTMLElement,
    matches: LogicalElementReactiveNamespaceMatch[]
  ) {
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

  updateReactiveProperties(
    element: HTMLElement,
    matches: LogicalElementReactiveNamespaceMatch[]
  ) {
    for (const match of matches) {
      let matchValue: any = match.value;

      if (matchValue?.startsWith("{") && matchValue?.endsWith("}")) {
        // Value is a context lookup and we need to fetch it
        matchValue = this.getStateValue(matchValue);
      }

      // TO-DO: think of a way to let component authors extend this list
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

  updateReactiveListeners(
    element: HTMLElement,
    matches: LogicalElementReactiveNamespaceMatch[]
  ) {
    // Compare the matches to the list of current handlers to determine if we need to remove any
    const elementHandlers = this._managedListeners.get(element) ?? [];
    const assignedHandlers: LogicalElementManagedHanders[] = [];

    for (const match of matches) {
      if (!match.value || !ReactiveState.isStateValue(match.value)) {
        // Value is not a context value and we cannot lookup the function to use as a handler
        console.warn(
          "Expected a state derived value, but instead received: ",
          match.value
        );
        return;
      }

      const handler = this.getStateValue(match.value);

      if (
        typeof handler === "function" &&
        !elementHandlers.some((h) => h === handler)
      ) {
        // Add event listener
        element.addEventListener(match.localName, handler);
      }

      // Record that this handler was assigned
      assignedHandlers.push({ eventType: match.localName, callback: handler });
    }

    // Compare assigned handlers to current handlers and remove any abandoned handlers
    for (const handler of elementHandlers) {
      if (
        !assignedHandlers.some(
          (h) =>
            h.callback === handler.callback && h.eventType === handler.eventType
        )
      ) {
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

      if (element instanceof ContextElement) {
        // CurrentNode is a context element, tell it to handle updating its own children and skip it
        // This is needed because the current context may not contain values required by children of another context
        element.updateReactiveChildren();
        currentNode = treewalker.nextSibling();
      } else {
        // Navigate to the next node
        currentNode = treewalker.nextNode();
      }

      // Get attributes from element and look for our defined reactive attributes
      for (const namespace in this.reactiveNamespaces) {
        const matches = element
          .getAttributeNames()
          .filter((attribute) => attribute.startsWith(`${namespace}:`));

        if (matches.length > 0) {
          const mappedMatches = matches.map((match) => {
            return {
              name: match,
              localName: match.split(":")[1],
              value: element.getAttribute(match),
            };
          });

          this.reactiveNamespaces[namespace].call(this, element, mappedMatches);
        }
      }
    }
  }
}

export default ContextElement;
