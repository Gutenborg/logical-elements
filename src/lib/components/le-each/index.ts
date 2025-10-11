import LogicalElement, {
  LogicalElementReactiveNamespaceMatch,
} from "../../core/logical-element";

type Iterable = Array<any>;

// TO-DO: Think about what this element is actually supposed to do
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

  get list(): Iterable {
    const attributeValue = this.getAttribute("list");
    const stateValue = this.getStateValue(attributeValue);

    if (!this.isIterable(stateValue)) {
      return [];
    } else return stateValue;
  }

  onConnected() {
    this.reactiveNamespaces.set("each", this.updateReactiveEach);
  }

  onUpdated() {}

  updateReactiveEach(
    element: HTMLElement,
    matches: LogicalElementReactiveNamespaceMatch[]
  ) {
    console.log(element, matches);

    const template = this.template;
  }

  isIterable(value: any) {
    if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
      return true;
    }

    return false;
  }

  renderTemplate(item: any, template: HTMLTemplateElement) {
    const clone = document.importNode(template.content, true);

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
