import LogicalElement from "../../core/logical-element";
import { getContextNamespace, lookupProperty } from "../../core/context";

class LeIf extends LogicalElement {
  get condition() {
    const attributeValue = this.getAttribute("condition");

    if (attributeValue === "true") {
      return true;
    }

    if (attributeValue === "false" || attributeValue === null) {
      return false;
    }

    // Attribute might be a context lookup
    const contextNamespace = getContextNamespace(attributeValue);

    if (
      contextNamespace !== null &&
      this.contextProviders[contextNamespace]?.context !== undefined &&
      this.contextProviders[contextNamespace]?.context !== null
    ) {
      const value = lookupProperty(
        attributeValue,
        this.contextProviders[contextNamespace].context.store
      );

      return value;
    }

    return false;
  }

  onUpdated() {
    if (this.condition) {
      this.showContent();
    } else {
      this.hideContent();
    }
  }

  hideContent() {
    console.log("Hiding content!", this);
    this.hidden = true;
  }

  showContent() {
    console.log("Showing content!", this);
    this.hidden = false;
  }
}

export default LeIf;

window.customElements.define("le-if", LeIf);
