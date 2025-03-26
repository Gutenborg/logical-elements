import { RootElement } from "../../lib/src";

class RootButton extends RootElement {
  testing = this.linkAttribute({ attribute: "testing" });

  handleClick = (event: MouseEvent) => {
    console.log("Clicked!");
  };

  template() {
    return `<button>
    ${this.testing.get()}
    <root-slot></root-slot>
    <root-slot name="testing"></root-slot>
    </button>`;
  }
}

customElements.define("root-button", RootButton);

export default RootButton;
