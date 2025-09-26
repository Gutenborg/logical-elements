import LogicalElement from '../../core/logical-element';
import { HTMLAttributeValue } from '../../core/shared-types';

class TestElement extends LogicalElement {
  static observedAttributes = ['prop-test', 'data-test'];

  onAttributeChanged(
    attribute: string,
    oldValue: HTMLAttributeValue,
    newValue: HTMLAttributeValue,
  ) {
    console.log('Attribute Changed!', {
      attribute,
      oldValue,
      newValue,
      this: this,
    });

    // Respond to changes for attributes as soon as they happen
  }

  onChildrenModified(records: MutationRecord[]) {
    console.log('Children Updated!', {
      records,
      this: this,
    });

    // Respond to changes for direct children
  }

  onConnected() {
    console.log('Connected!', {
      this: this,
    });

    // Initialize component when it is connected to the DOM, but attributes and children might not be ready
    // Fires only once
  }

  onDisconnected() {
    console.log('Disconnected!', {
      this: this,
    });

    // Cleanup component
  }

  onParsed() {
    console.log('Parsed!', { this: this });
    // Initialize component with attributes and children ready
    // Fires only once
  }

  onUpdated() {
    // Define reactivity to a debounced group of attribute changed, children modified, and parsed events
    console.log('Updated!', { this: this });

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
