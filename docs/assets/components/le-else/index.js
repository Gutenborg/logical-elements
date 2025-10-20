import LogicalElement from "../../core/logical-element";
import LeEach from "../le-each";
import LeIf from "../le-if";
/** Determines relevant siblings to watch and check for a condition. If all relevant siblings return
 * their condition as false, this element is shown. Otherwise it is hidden.
 *
 * TO-DO: Make sure the element is watching the siblings directly instead of relying on an updated event from the parent*/
class LeElse extends LogicalElement {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "relevantSiblingHandlers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map([
                ["le-each", this.checkLeEach],
                ["le-if", this.checkLeIf]
            ])
        });
    }
    get relevantSiblings() {
        let returnValue = [];
        if (!(this.parentElement instanceof HTMLElement)) {
            return returnValue;
        }
        const qualifiedSiblings = this.parentElement.querySelectorAll(Array.from(this.relevantSiblingHandlers.keys()).join(","));
        if ((qualifiedSiblings === null || qualifiedSiblings === void 0 ? void 0 : qualifiedSiblings.length) > 0) {
            returnValue = Array.from(qualifiedSiblings);
        }
        return returnValue;
    }
    onDisconnected() {
        var _a;
        (_a = this.parentElement) === null || _a === void 0 ? void 0 : _a.removeEventListener("le-updated", this.handleUpdates);
    }
    onParsed() {
        var _a;
        // Attach an event listener to the parent to observe for updating children
        (_a = this.parentElement) === null || _a === void 0 ? void 0 : _a.addEventListener("le-updated", this.handleUpdates.bind(this));
    }
    // TO-DO: Make sure this runs when a relevant sibling calls their updatedCallback() method
    onUpdated() {
        let siblingStatus = false;
        const relevantSiblings = this.relevantSiblings;
        for (const sibling of relevantSiblings) {
            const siblingChecker = this.relevantSiblingHandlers.get(sibling.tagName.toLowerCase());
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
        }
        else {
            this.showContent();
        }
    }
    handleUpdates(event) {
        const relevantSiblings = this.relevantSiblings;
        for (const sibling of relevantSiblings) {
            if (event.target === sibling) {
                this.updateScheduler.scheduleUpdate(this.updatedCallback.bind(this));
                break;
            }
        }
    }
    checkLeEach(element) {
        if (!(element instanceof LeEach)) {
            return false;
        }
        return !element.isEmpty;
    }
    checkLeIf(element) {
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
