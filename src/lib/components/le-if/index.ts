import LogicalElement from "../../core/logical-element";

class LeIf extends LogicalElement {
  static observedAttributes = ["condition"];

  get condition() {
    return this.getAttributeFromState("condition");
  }

  onUpdated() {
    if (this.isConditionTrue()) {
      this.showContent();
    } else {
      this.hideContent();
    }
  }

  hideContent() {
    this.hidden = true;
  }

  showContent() {
    this.hidden = false;
  }

  isConditionTrue() {
    const condition = this.condition;

    if (condition === "true") {
      return true;
    }

    if (condition === "false" || condition === null) {
      return false;
    }

    return condition;
  }
}

export default LeIf;

window.customElements.define("le-if", LeIf);
