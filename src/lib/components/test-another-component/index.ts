import LogicalElement from '../../core/logical-element';

class TestAnotherElement extends LogicalElement {
  static observedAttributes = ['prop-test'];

  onConnected() {}

  onParsed() {
    const assignments = this.querySelectorAll('button');

    assignments.forEach(element => {
      element.textContent = this.getAttribute(
        element.getAttribute('data-assign') ?? '',
      );
    });
  }
}

export default TestAnotherElement;

window.customElements.define('test-another-element', TestAnotherElement);
