import LogicalElement from '../../core/logical-element';
import { HTMLAttributeValue } from '../../core/shared-types';

class TestElement extends LogicalElement {
  static observedAttributes = ['prop-test', 'data-test'];

  onAttributeChanged(
    attribute: string,
    oldValue: HTMLAttributeValue,
    newValue: HTMLAttributeValue,
  ) {
    // Respond to changes for attributes as soon as they happen
  }

  onChildrenModified(records: MutationRecord[]) {
    // Respond to changes for direct children
  }

  onConnected() {
    // Initialize component when it is connected to the DOM, but attributes and children might not be ready
    // Fires only once
    this.state.store = { testProperty: true };

  }
  
  onDisconnected() {
    // Cleanup component
  }
  
  onParsed() {
    // Initialize component with attributes and children ready
    // Fires only once
  }

  onStateUpdated(property: string, previousValue: any, newValue: any): void {
    // Only triggers once the element has been parsed
    console.log(property, previousValue, newValue);
  }

  onUpdated() {
    // Define reactivity to a debounced group of attribute changed, children modified, state updated, and parsed events
    console.log("Updated!");
  }
}

export default TestElement;

window.customElements.define('test-element', TestElement);
