import { defaultEventOptions } from "./utilities";

export type AttributeConvertTypes =
  | "array"
  | "boolean"
  | "number"
  | "object"
  | "string";

export interface RootLifecycleEventMap {
  "root-element-connected": CustomEvent<null>;
  "root-element-disconnected": CustomEvent<null>;
  "root-element-initialized": CustomEvent<null>;
  "root-element-updated": CustomEvent<null>;
}

export interface AttributeConvertDefinition {
  fromAttribute: (value: string) => unknown;
  toAttribute: (value: unknown) => string;
}

export interface LinkAttributeOptions {
  attribute?: string;
  convert?: AttributeConvertTypes | AttributeConvertDefinition;
}

export interface CustomEventOptions extends CustomEventInit {
  name: keyof RootLifecycleEventMap | string;
}

class RootElement extends HTMLElement {
  private static observedAttributes = [];

  public enableShadow: boolean = false;

  protected isInitialized: boolean = false;

  protected lifecycle = {
    connected: this.defineEvent({
      ...defaultEventOptions,
      name: "root-element-connected",
    }),
    disconnected: this.defineEvent({
      ...defaultEventOptions,
      name: "root-element-disconnected",
    }),
    initialized: this.defineEvent({
      ...defaultEventOptions,
      name: "root-element-initialized",
    }),
    updated: this.defineEvent({
      ...defaultEventOptions,
      name: "root-element-updated",
    }),
  };

  protected propertyValues: Record<string, unknown> = {};
  protected renderRoot: ShadowRoot | RootElement;

  constructor() {
    super();

    if (this.enableShadow) {
      this.renderRoot = this.attachShadow({ mode: "open" });
    } else {
      this.renderRoot = this;
    }

    // Register lifecycle event handlers
    this.lifecycle.connected.listen(this.initialize);
  }

  attributeChangedCallback() {}

  connectedCallback() {
    this.lifecycle.connected.dispatch();
  }

  defineEvent<T = null>(options: CustomEventOptions) {
    const dispatch = (overrideOptions: CustomEventInit<T> = {}) => {
      const event = new CustomEvent<T>(options.name, {
        ...defaultEventOptions,
        ...overrideOptions,
      });

      this.dispatchEvent(event);
    };

    const listen = (callback: (event: CustomEvent<T>) => void) => {
      this.addEventListener(options.name, callback as EventListener);
    };

    return {
      dispatch,
      listen,
      name: options.name,
    };
  }

  disconnectedCallback() {
    this.lifecycle.disconnected.dispatch();
  }

  initialize() {
    if (this.enableShadow) {
      this.renderRoot.innerHTML = this.render();
    } else {
      // We need to manually assign slotted elements
      this.slotElements(this.render());
    }

    this.isInitialized = true;
    this.lifecycle.initialized.dispatch();
  }

  render() {
    // Default render method
    return ``;
  }

  slotElements(renderedHTML: string) {
    // The renderedHTML is what the component has rendered, and this.childnodes is what the is currently in the component
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = renderedHTML;

    // Sort childnodes into slots
    const childNodes = Array.from(this.childNodes);

    const sortedNodes = childNodes.map((node) => {
      const sort = {
        node, // Which node has been slotted
        slot: "", // Sort initially into default
        type: "text",
      };

      if (node.nodeType === 3) {
        console.log("Text!");
        return sort;
      } else if (node.nodeType === 1) {
        console.log({ node: (node as Element).slot });
        sort.slot = (node as Element).slot;
        sort.type = "element";
        return sort;
      } else {
        console.log("Invalid!");
        sort.type = "invalid";
        return sort;
      }
    });

    const allSlots = Array.from(tempContainer.querySelectorAll("slot"));

    sortedNodes.forEach((node) => {
      const foundSlot = allSlots.find((slot) => slot.name === node.slot);

      console.log(foundSlot);

      if (foundSlot && node.type === "element") {
        foundSlot.insertAdjacentElement("beforebegin", node.node as Element);
      } else if (foundSlot && node.type === "text") {
        foundSlot.insertAdjacentText(
          "beforebegin",
          node.node.textContent as string
        );
      } else {
        node.node.remove();
      }
    });

    this.replaceChildren(tempContainer.firstChild as ChildNode);
  }

  /* To-Do: Set up reflections using custom events */
  /*
  Class defines property and creates an event listener for a custom event that will update the property value
  Class assigns a default value to the property
  Property setter sets the property value and sends out the custom event to update the attribute
  Component is not initialized, so it adds the update to the update queue
  Component initializes and reads the value in the attribute
  The attributeChangedCallback sends out the custom event to update the property
  Component is not fully initialized so it adds the update to the update queue
  Component processes the update queue and sends out an event to signal that it is done processing
  If the property or attribute change it sends out the event and the component handles the update
*/
}

export default RootElement;
