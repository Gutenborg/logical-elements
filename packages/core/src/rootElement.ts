import { defaultEventOptions } from "./utilities";

export type AttributeConvertTypes = "boolean" | "number" | "string";

export interface RootLifecycleEventUpdatedDetail {
  type: "attribute" | "childNode";
  target: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface RootLifecycleEventMap {
  "root-element-connected": CustomEvent<null>;
  "root-element-disconnected": CustomEvent<null>;
  "root-element-initialized": CustomEvent<null>;
  "root-element-updated": CustomEvent<RootLifecycleEventUpdatedDetail>;
}

export interface AttributeConvertDefinition {
  fromAttribute: (value: string | null) => RootAttributeValue;
  toAttribute: (value: unknown) => string | null;
}

export interface LinkAttributeOptions {
  attribute: string;
  convert?: AttributeConvertTypes | AttributeConvertDefinition;
}

export interface RootAttributeDefinition {
  get: () => RootAttributeValue;
  getDirect: () => string | null;
  set: (value: RootAttributeValue) => void;
  setDirect: (value: string) => void;
}

export type RootAttributeValue = string | boolean | number;

export interface CustomEventOptions extends CustomEventInit {
  name: keyof RootLifecycleEventMap | string;
}

export interface RootSlottedNode {
  node: ChildNode;
  slot: string;
}

export class RootElement extends HTMLElement {
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
    updated: this.defineEvent<RootLifecycleEventUpdatedDetail>({
      ...defaultEventOptions,
      name: "root-element-updated",
    }),
  };

  private observerForAttribute = new MutationObserver((changes) => {
    changes.forEach((change) => {
      if (
        change.type === "attributes" &&
        typeof change.attributeName === "string"
      ) {
        const attributeValue = this.getAttribute(change.attributeName);

        if (change.oldValue !== attributeValue) {
          this.attributeChangedCallback(
            change.attributeName,
            change.oldValue,
            this.getAttribute(change.attributeName)
          );
        }
      }
    });
  });

  private observerForChildNodes = new MutationObserver(
    this.childrenUpdatedCallback
  );

  protected renderRoot: ShadowRoot | RootElement;

  constructor() {
    super();

    if (this.enableShadow) {
      this.renderRoot = this.attachShadow({ mode: "open" });
    } else {
      this.renderRoot = this;
    }
  }

  protected applyTemplate(markupTemplate: string = this.template()) {
    const parser = new DOMParser().parseFromString(
      markupTemplate,
      "text/html"
    ).body;

    // Mark all rendered elements
    parser
      .querySelectorAll("*")
      .forEach((element) => element.setAttribute("data-rendered-element", ""));

    // Sort through direct child nodes and add them to the slotted nodes list
    Array.from(this.childNodes).forEach((node) => {
      if (
        node instanceof Element &&
        node.getAttribute("data-rendered-element") !== null
      ) {
        return;
      }

      let slotName = "";

      if (node instanceof Text) {
        this.slottedNodes.push({ node, slot: slotName });
      } else if (node instanceof Element) {
        this.slottedNodes.push({ node, slot: node.slot });
      }
    });

    // Slot child nodes
    const allSlots = Array.from(parser.querySelectorAll("slot"));

    this.slottedNodes.forEach(({ node, slot }, index) => {
      const matchingSlot = allSlots.find((s) => s.name === slot);

      if (!matchingSlot) {
        node.remove();
        this.slottedNodes.splice(index, 1);
        return;
      }

      if (node instanceof Text) {
        matchingSlot.insertAdjacentText("afterend", node.textContent ?? "");
      } else if (node instanceof Element) {
        matchingSlot.insertAdjacentElement("afterend", node as Element);
      }
    });

    this.replaceChildren(...parser.childNodes);
  }

  attributeChangedCallback(
    attribute: string,
    oldValue: string | null,
    newValue: string | null
  ) {
    this.lifecycle.updated.dispatch({
      detail: { type: "attribute", target: attribute, oldValue, newValue },
    });

    this.applyTemplate(this.template());
  }

  childrenUpdatedCallback() {
    console.log("Children Updated!");
  }

  connectedCallback() {
    this.lifecycle.connected.dispatch();
    this.initialize();
  }

  convertFromAttribute(
    value: string | null,
    convertMethod?: AttributeConvertTypes
  ) {
    let convertedValue: RootAttributeValue = "";

    switch (convertMethod) {
      case "boolean":
        convertedValue = !!value;
        break;
      case "number":
        convertedValue = Number(value);
        break;
      case "string":
      default:
        convertedValue = value === null ? "" : String(value);
        break;
    }

    return convertedValue;
  }

  convertToAttribute(
    value: RootAttributeValue,
    convertMethod?: AttributeConvertTypes
  ) {
    let convertedValue: string | null = "";

    switch (convertMethod) {
      case "boolean":
        convertedValue = value ? "" : null;
        break;
      case "number":
      case "string":
      default:
        convertedValue = String(value);
        break;
    }

    return convertedValue;
  }

  protected defineEvent<T = null>(options: CustomEventOptions) {
    const dispatch = (overrideOptions: CustomEventInit<T> = {}) => {
      const event = new CustomEvent<T>(options.name, {
        ...defaultEventOptions,
        ...overrideOptions,
      });

      this.dispatchEvent(event);
    };

    const listen = (callback: (event: CustomEvent<T>) => void) => {
      this.addEventListener(options.name, (event) => {
        // Check to make sure that the event is happening on this element
        if (typeof callback === "function" && this === event.target) {
          callback.apply(this, [event as CustomEvent<T>]);
        }
      });
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

  private initialize() {
    // This is called to handle the first rendering and should not be called again
    this.applyTemplate(this.template());

    // Setup observers
    this.observerForAttribute.observe(this, { attributeOldValue: true });
    this.observerForChildNodes.observe(this, { childList: true });

    this.isInitialized = true;
    this.lifecycle.initialized.dispatch();
  }

  protected linkAttribute(
    options: LinkAttributeOptions
  ): RootAttributeDefinition {
    // Handles data conversion
    const get = () => {
      const attributeValue = this.getAttribute(options.attribute);

      let convertedValue: RootAttributeValue = "";

      if (options.convert && typeof options.convert !== "string") {
        convertedValue = options.convert.fromAttribute(attributeValue);
      } else {
        convertedValue = this.convertFromAttribute(
          attributeValue,
          options.convert
        );
      }

      return convertedValue;
    };

    // Pulls the attribute value directly
    const getDirect = () => {
      return this.getAttribute(options.attribute);
    };

    // Handles data conversion
    const set = (value: RootAttributeValue) => {
      let convertedValue: string | null;

      if (options.convert && typeof options.convert !== "string") {
        convertedValue = options.convert.toAttribute(value);
      } else {
        convertedValue = this.convertToAttribute(value, options.convert);
      }

      if (convertedValue === null) {
        this.removeAttribute(options.attribute);
      } else {
        this.setAttribute(options.attribute, convertedValue);
      }
    };

    // Sets the attribute value directly
    const setDirect = (value: string | null) => {
      if (value === null) {
        this.removeAttribute(options.attribute);
      } else {
        this.setAttribute(options.attribute, value);
      }
    };

    return {
      get,
      getDirect,
      set,
      setDirect,
    };
  }

  private slottedNodes: RootSlottedNode[] = [];

  template() {
    // Default render method
    return `<slot></slot>`;
  }
}

export default RootElement;
