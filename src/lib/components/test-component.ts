import LogicalElement, { LogicalElementReactiveMatch } from "../core/logical-element";

/** Has a condition attribute that can be true or false. If true, the element is shown, otherwise it is hidden. */
class TestComponent extends LogicalElement {
  onConnected() {
      this.reactiveNamespaces.set("test", this.handleTestNamespace)
  }

  handleTestNamespace (matches: LogicalElementReactiveMatch[], logicalParent: LogicalElement) {
      
      for(const match of matches) {
          console.log("Testing!", match, logicalParent);
    }
  }
}

export default TestComponent;

window.customElements.define("test-component", TestComponent);
