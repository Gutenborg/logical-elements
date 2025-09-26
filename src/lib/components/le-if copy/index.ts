import LogicalElement from "../../core/logical-element";
import { isContext, readContext } from "../../core/context";

class LeIf extends LogicalElement {
  get condition() {
    let returnValue = false;
    const attributeValue = this.getAttribute("condition");

    if (isContext(attributeValue)) {
      returnValue = readContext(this, attributeValue);
    } else if (attributeValue === "true") {
      returnValue = true;
    }

    return returnValue;
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
