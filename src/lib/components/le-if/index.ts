import LogicalElement from "../../core/logical-element";
import { ReactiveState } from "../../core/reactive-state";

class LeIf extends LogicalElement {
  static observedAttributes = ["condition"];

  get condition() {
    return this.getAttribute("condition");
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

    if (condition === "false" || condition === null || !ReactiveState.isStateValue(condition)) {
      return false;
    }

    return !!this.getStateValue(condition);
  }
}

export default LeIf;

window.customElements.define("le-if", LeIf);
