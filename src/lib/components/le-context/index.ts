import LogicalElement from "../../core/logical-element";
import { ContextStore, ContextUpdatedEventDetail } from "../../core/context";

interface LeContext {
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
  addEventListener<K extends keyof LeContextEventMap>(
    type: K,
    listener: (this: LogicalElement, event: LeContextEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: LogicalElement, event: HTMLMediaElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: (this: LogicalElement, event: Event) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof LeContextEventMap>(
    type: K,
    listener: (this: LogicalElement, event: LeContextEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
}

export interface LeContextEventMap {
  "le-context-updated": CustomEvent<ContextUpdatedEventDetail>;
}

class LeContext extends LogicalElement {
  _context: ContextStore | null = null;
  get context() {
    return this._context;
  }

  set context(value) {
    this._context = value;

    if (this.isParsed) {
      // Dispatch context update event
      const contextUpdateEvent = new CustomEvent<ContextUpdatedEventDetail>(
        "le-context-updated",
        {
          bubbles: false,
          cancelable: false,
          composed: false,
          detail: null,
        }
      );

      this.dispatchEvent(contextUpdateEvent);
    }
  }

  get namespace() {
    return this.getAttribute("namespace");
  }

  onDisconnected() {
    this.removeEventListener("le-context-updated", this.onContextUpdated);
  }

  onParsed() {
    // Check for a context script element
    const contextScript = this.querySelector<HTMLScriptElement>(
      "script[data-context]"
    );

    if (contextScript !== null && this.namespace === null) {
      // There is a script, but no namespace to lookup the function with
      console.warn("No namespace provided to lookup the context function");
    } else if (
      contextScript !== null &&
      typeof this.namespace === "string" &&
      typeof window[this.namespace as keyof Window] === "function"
    ) {
      // Need to run the context script and get the value
      const contextValue = window[this.namespace as keyof Window]();
      this.context = new ContextStore(contextValue, this);
    }

    // Set up the event listener for context updates
    this.addEventListener("le-context-updated", this.onContextUpdated);
  }

  onContextUpdated(event: CustomEvent<ContextUpdatedEventDetail>) {
    console.log("Context updated!", event);
  }
}

export default LeContext;

window.customElements.define("le-context", LeContext);
