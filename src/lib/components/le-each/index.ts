import LogicalElement, {
  LogicalElementReactiveMatch,
} from "../../core/logical-element";
import {
  handleAttributes,
  handleListeners,
  handleProperties,
} from "../../core/reactive-handlers";

type IterableList = Array<any>;

/** Can be provided a list and for each item in the list will iterate over a template. */
class LeEach extends LogicalElement {
  get template() {
    return this.querySelector<HTMLTemplateElement>("template");
  }

  get isEmpty() {
    if (this.list.length <= 0) {
      return false;
    }

    return true;
  }

  get list(): IterableList {
    const attributeValue = this.getAttribute("list");
    const stateValue = this.getStateValue(attributeValue);

    if (!this.isIterable(stateValue)) {
      return [];
    }

    return stateValue;
  }

  onConnected() {
    // Create the "each" namespace for attributes
    this.reactiveNamespaces.set("each", this.updateReactiveEach);
  }

  onUpdated() {}

  updateReactiveEach(matches: LogicalElementReactiveMatch[]) {
    const list = this.list;
    const template = this.template;
    const variableName = this.getAttribute("as");

    if (
      list.length === 0 ||
      !(template instanceof HTMLTemplateElement) ||
      typeof variableName !== "string"
    ) {
      // Nothing to iterate on
      return;
    }

    for (const match of matches) {
      // Remove any previously rendered children from the element
      match.element.childNodes.forEach((childNode) => childNode.remove());

      // Render the template
      for (const item of list) {
        console.log("Rendering template for item in the list: ", item);
        const renderedTemplate = this.renderTemplate(item, template);

        match.element.appendChild(renderedTemplate);
      }
    }
  }

  isIterable(value: any) {
    if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
      return true;
    }

    return false;
  }

  renderTemplate(item: any, template: HTMLTemplateElement) {
    const clone = document.importNode(template.content, true);

    // console.log(item);

    // Apply each value to the template and append it as a child of the container
    /* const assignments = clone.querySelectorAll("[data-assign]");

    assignments.forEach((element) => {
      element.textContent = item;
    }); */

    return clone;
  }
}

export default LeEach;

window.customElements.define("le-each", LeEach);
