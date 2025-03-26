import "./style.css";

import "../../components/src/index";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>Root UI</h1>

    <div class="card">
      <root-button testing="This is a test">
        Testing <p slot="testing">Another Test!</p> <p slot="not-a-real-slot">Yet Another Test!</p>
      </root-button>
    </div>
  </div>
`;
