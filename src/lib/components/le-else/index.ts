import LogicalElement from "../../core/logical-element";
import LeIf from "../le-if";

type RelevantSiblingType = "le-if" | "le-each";

class LeElse extends LogicalElement {
  validSiblings: RelevantSiblingType[] = ["le-each", "le-if"];
  siblingType: RelevantSiblingType | null = null;

  get relevantSiblings() {
    if (this.siblingType === null || this.parentElement === null) {
      return [];
    }

    return Array.from<LeIf>(
      this.parentElement.querySelectorAll(this.siblingType)
    );
  }

  onParsed() {
    // Determine sibling type/*  */
    for (const type of this.validSiblings) {
      const siblings = this.parentElement?.querySelectorAll(type);

      if (siblings instanceof NodeList && siblings.length > 0) {
        this.siblingType = type;
        break;
      }
    }
  }

  onUpdated() {
    let shouldShow = false;
    // Check to see if siblings are being shown
    switch (this.siblingType) {
      case "le-each":
        break;
      case "le-if":
        shouldShow = this.relevantSiblings.every((sibling) => {
          return !sibling.condition;
        });
        break;
      default:
        break;
    }

    if (shouldShow) {
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
}

export default LeElse;

window.customElements.define("le-else", LeElse);
