import HTMLParsedElement from "./html-parsed-element";
import ReactiveState from "./reactive-state";
import { HTMLAttributeValue } from "./shared-types";
import {
  reactiveAttr,
  reactiveOn,
  reactiveSet,
} from "./reactive-handlers";
import { reactiveCls } from "./reactive-handlers/cls";

interface LogicalElement {
  onStateUpdated?(property: string, previousValue: any, newValue: any): void;
}

type LogicalElementReactiveNamespaces = Map<
  string,
  LogicalElementReactiveHandler
>;

export type LogicalElementReactiveHandler = (
  matches: LogicalElementReactiveMatch[],
  instance: LogicalElement
) => void;

export interface LogicalElementReactiveMatch {
  element: HTMLElement;
  name: string;
  localName: string;
  value: HTMLAttributeValue;
}

export interface StateUpdatedEventDetail {
  property: string;
  previousValue: HTMLAttributeValue;
  newValue: HTMLAttributeValue;
}

/** Provides an element that has a state and allows you to place a state-defining script within it */
class LogicalElement extends HTMLParsedElement {
  // MARK: Properties
  private _state = new ReactiveState(this._stateName);
  private _stateSubscriberId: number | null = null;
  public reactiveNamespaces: LogicalElementReactiveNamespaces = new Map();

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

  updatedCallback() {
    super.updatedCallback();

    this.handleReactiveNamespaces();
  }

  // Utility Methods
  handleReactiveNamespaces() {
    if (!this.isParsed || !this.isInitialized) {
      // We are not ready for reactivity
      return;
    }

    let matchMap = new Map<
      LogicalElementReactiveHandler,
      LogicalElementReactiveMatch[]
    >();

    this.eachChild((currentElement, treewalker) => {
      if (currentElement instanceof LogicalElement) {
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
          const mappedMatches: LogicalElementReactiveMatch[] = matches.map(
            (match) => {
              return {
                element: currentElement,
                name: match,
                localName: match.split(":")[1],
                value: currentElement.getAttribute(match),
              };
            }
          );

          if (matchMap.has(handler) && Array.isArray(matchMap.get(handler))) {
            const currentMatches = matchMap.get(handler)!;
            matchMap.set(handler, currentMatches.concat(mappedMatches));
          } else {
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
