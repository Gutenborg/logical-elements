import LogicalElement from "../../core/logical-element";

type Iterable = Array<any>;

class LeEach extends LogicalElement {
  get template() {
    return this.querySelector<HTMLTemplateElement>("template[data-for]");
  }

  get iterator() {
    const attributeValue = this.getAttribute("list");
    const stateValue = this.getStateValue(attributeValue);

    if (!this.isIterable(stateValue)) {
      // There is no attribute to look up
      console.warn(
        "Expected a state derived value, but instead received: ",
        stateValue
      );
      return [];
    }

    return stateValue as Iterable;
  }

  get isEmpty() {
    if (this.iterator.length <= 0) {
      return false;
    }

    return true;
  }

  onUpdated() {
    const template = this.template;
    const templateDestination = this.querySelector("[set:template]");

    if (template === null || templateDestination === null) {
      // There is no template or a container to apply
      return;
    }

    const iterator = this.iterator;

    if (iterator.length <= 0) {
      // Nothing to iterate on
      return;
    }

    // Remove all previously rendered children from the container
    templateDestination.childNodes.forEach((node) => node.remove());

    iterator.forEach((value) => {
      const renderedTemplate = this.renderTemplate(value, template);

      templateDestination.appendChild(renderedTemplate);
    });
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
