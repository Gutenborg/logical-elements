import LogicalElement from "../../core/logical-element";
import { getContextNamespace, lookupProperty } from "../../core/context";

class LeEach extends LogicalElement {
  /* get template() {
    return this.querySelector<HTMLTemplateElement>("template[data-for]");
  }

  get templateContainer () {
    const containerId = this.template?.dataset.for;

    if (typeof containerId !== "string") {
      return null;
    }
    
    return this.querySelector(`#${containerId}`);
  }

  get iterator () {
    const attributeValue = this.getAttribute("for");
    const contextNamespace = getContextNamespace(attributeValue);

    if (typeof attributeValue !== "string" || typeof contextNamespace !== "string") {
      // There is no attribute to look up
      return [];
    }

    
    const context = this.contextProviders[contextNamespace]?.context;
    
    if (context === undefined || context === null) {
      return [];
    }

    const value = lookupProperty(attributeValue, context.store);

    if (!Array.isArray(value)) {
      return [];
    } else {
      return value;
    }
  }

  get isEmpty () {
    if (this.iterator.length <= 0) {
      return false;
    } else {
      return true;
    }
  }

  onUpdated() {
    const template = this.template;
    const container = this.templateContainer;

    if (template === null || container === null) {
      // There is no template or a container to apply
      return;
    }
    
    const iterator = this.iterator;
    
    if (iterator.length <= 0) {
      // Nothing to iterate on
      
      return;
    }
    
    
    // Remove all previously rendered children from the container
    container.childNodes.forEach((node) => node.remove());
    
    iterator.forEach((value) => {
      const renderedTemplate = this.renderTemplate(value, template);
      
      container.appendChild(renderedTemplate);
    });
    
  }

  renderTemplate(item: any, template: HTMLTemplateElement) {
    const clone = document.importNode(template.content, true);

    // Apply each value to the template and append it as a child of the container
    const assignments = clone.querySelectorAll("[data-assign]");

    assignments.forEach((element) => {
      element.textContent = item;
    });

     return clone;
  } */
}

export default LeEach;

window.customElements.define("le-each", LeEach);
