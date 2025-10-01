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
  }

  onDisconnected() {
    // Cleanup component
  }

  onParsed() {
    // Initialize component with attributes and children ready
    // Fires only once
  }

  onUpdated() {
    // Define reactivity to a debounced group of attribute changed, children modified, and parsed events
    const assignments = this.querySelectorAll('button');

    assignments.forEach(element => {
      element.textContent = this.getAttribute(
        element.getAttribute('data-assign') ?? '',
      );
    });
  }
}

export default TestElement;

window.customElements.define('test-element', TestElement);
