import RootElement from "../../../core/src/rootElement";

class RootButton extends RootElement {
  render() {
    return `<button><slot></slot><slot name="testing"></slot></button>`;
  }
}

customElements.define("root-button", RootButton);

export default RootButton;
