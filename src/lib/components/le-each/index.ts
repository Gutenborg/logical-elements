import LogicalElement from "../../core/logical-element";

type IterableList = Array<any>;

/** Can be provided a list and for each item in the list will iterate over a template. */
class LeEach extends LogicalElement {
  static observedAttributes = ["as", "list"];

  renderedItemCount = 0;
  
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

    if (!Array.isArray(stateValue)) {
      return [];
    }

    return stateValue;
  }
  
  onParsed() {
    this.renderEach();
  }
  
  onProviderUpdated() {
    if (this.renderedItemCount !== this.list.length) {
      this.renderEach();
    }
  }

  renderEach() {
    const list = this.list;
    const template = this.template;
    const variableName = this.getAttribute("as");
    const container = this.querySelector("[data-apply-template]");

    if (
      container === null ||
      list.length === 0 ||
      !(template instanceof HTMLTemplateElement) ||
      typeof variableName !== "string"
    ) {
      // Nothing to iterate on
      return;
    }

    const fragment = document.createDocumentFragment();

    Array.from(container.childNodes).forEach((childNode) => childNode.remove());

    // Render the template
    for (const key of list.keys()) {
      const clone = document.importNode(template.content, true);

      this.eachChild((currentChild) => {
        for(const attribute of currentChild.attributes) {
          if (attribute.value === `{${variableName}}`) {
            const listPath = this.getAttribute("list")!.slice(1, -1);
            attribute.value = `{${listPath}.${key}}`;
          }
        }
      }, clone);

      fragment.appendChild(clone);
    }

    this.renderedItemCount = list.length;
    container.appendChild(fragment);
  }
}

export default LeEach;

window.customElements.define("le-each", LeEach);
