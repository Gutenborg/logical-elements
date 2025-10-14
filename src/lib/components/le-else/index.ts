import LogicalElement from "../../core/logical-element";
import LeEach from "../le-each";
import LeIf from "../le-if";

type RelevantSiblingTypes = "le-if" | "le-each" | string;
type RelevantSiblingElements = LeIf | LeEach | HTMLElement;
type RelevantSiblingHandler = (sibling: RelevantSiblingElements) => boolean;
type RelevantSiblingHandlers = Map<
  RelevantSiblingTypes | string,
  RelevantSiblingHandler
>;

/** Determines relevant siblings to watch and check for a condition. If all relevant siblings return
 * their condition as false, this element is shown. Otherwise it is hidden.
 *
 * TO-DO: Make sure the element is watching the siblings directly instead of relying on an updated event from the parent*/
class LeElse extends LogicalElement {
  public relevantSiblingHandlers: RelevantSiblingHandlers = new Map([
    ["le-each", this.checkLeEach],
    ["le-if", this.checkLeIf]
  ]);

  get relevantSiblings() {
    let returnValue: HTMLElement[] = [];

    if (!(this.parentElement instanceof HTMLElement)) {
      return returnValue;
    }

    const qualifiedSiblings = this.parentElement.querySelectorAll<HTMLElement>(
      Array.from(this.relevantSiblingHandlers.keys()).join(",")
    );

    if (qualifiedSiblings?.length > 0) {
      returnValue = Array.from(qualifiedSiblings);
    }

    return returnValue;
  }

  onDisconnected() {
    this.parentElement?.removeEventListener("le-updated", this.handleUpdates);
  }

  onParsed() {
    // Attach an event listener to the parent to observe for updating children
    this.parentElement?.addEventListener(
      "le-updated",
      this.handleUpdates.bind(this)
    );
  }

  // TO-DO: Make sure this runs when a relevant sibling calls their updatedCallback() method
  onUpdated() {
    let siblingStatus = false;
    const relevantSiblings = this.relevantSiblings;

    for (const sibling of relevantSiblings) {
      const siblingChecker =
        this.relevantSiblingHandlers.get(sibling.tagName.toLowerCase());

      // Check the sibling
      if (typeof siblingChecker === "function" && siblingChecker(sibling)) {
        // One sibling has returned their visibility status as true, so we can exit the loop
        siblingStatus = true;
        break;
      }
    }

    // Check to see if siblings are being shown
    if (siblingStatus) {
      this.hideContent();
    } else {
      this.showContent();
    }
  }

  handleUpdates(event: Event) {
    const relevantSiblings = this.relevantSiblings;

    for (const sibling of relevantSiblings) {
      if (event.target === sibling) {
        this.updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));
        break;
      }
    }
  }

  checkLeEach(element: RelevantSiblingElements) {
    if (!(element instanceof LeEach)) {
      return false;
    }

    return !element.isEmpty;
  }

  checkLeIf(element: RelevantSiblingElements) {
    if (!(element instanceof LeIf)) {
      return false;
    }

    return element.condition;
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
