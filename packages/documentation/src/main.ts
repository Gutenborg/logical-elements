import "./style.css";

import "../../components/src/index";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>Root UI</h1>

    <div class="card">
      <root-button>Testing <p slot="testing">Another Test!</p> <p slot="not-a-real-slot">Yet Another Test!</p></root-button>
      <root-button>Testing <p slot="testing">Another Test!</p> <p slot="not-a-real-slot">Yet Another Test!</p></root-button>
      <root-button>Testing <p slot="testing">Another Test!</p> <p slot="not-a-real-slot">Yet Another Test!</p></root-button>
      <root-button>Testing <root-button>Testing</root-button></root-button>
    </div>
  </div>
`;
