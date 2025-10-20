import ContextElement from "../../core/context-element";
/** Provides an element that has a state and reactivity and allows you to place a state-defining
 * script within it. The purpose of this component is to give users the ability to easily add state
 * logic next to locations where it is relevant in the markup. */
class LeContext extends ContextElement {
    onParsed() {
        // Check for a context script element
        const contextScript = this.querySelector("script");
        const name = this.getAttribute("name");
        if (contextScript !== null && name === null) {
            // There is a script, but no namespace to lookup the function with
            console.warn("No namespace provided to lookup the context function");
        }
        else if (contextScript !== null &&
            typeof name === "string" &&
            typeof window[name] === "function") {
            // Need to run the context script and get the value
            this.state.store = window[name].call(this, this.state);
        }
    }
}
export default LeContext;
window.customElements.define("le-context", LeContext);
