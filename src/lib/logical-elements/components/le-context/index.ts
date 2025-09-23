import LogicalElement from '../../core/logical-element';
import { HTMLAttributeValue } from '../../core/shared-types';

class LeContext extends LogicalElement {
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
  }
}

export default LeContext;

window.customElements.define('le-context', LeContext);
