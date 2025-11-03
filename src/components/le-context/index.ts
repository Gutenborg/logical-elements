import LogicalElement from "../../core/logical-element";

/** Provides an element that has a state and reactivity and allows you to place a state-defining
 * script within it. The purpose of this component is to give users the ability to easily add state
 * logic next to locations where it is relevant in the markup. */
class LeContext extends LogicalElement {
  onParsed() {
    // Check for a context script element
    const contextScript = this.querySelector<HTMLScriptElement>("script");
    const name = this.getAttribute("name");

    if (contextScript !== null && name === null) {
      // There is a script, but no namespace to lookup the function with
      console.warn("No namespace provided to lookup the context function");
    } else if (
      contextScript !== null &&
      typeof name === "string" &&
      typeof window[name as keyof Window] === "function"
    ) {
      // Need to run the context script and get the value
      this.state.store = window[name as keyof Window].call(this, this.state);
    }
  }
}

export default LeContext;

window.customElements.define("le-context", LeContext);
