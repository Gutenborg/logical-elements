import "./style.css";
import "../../lib";
import { ContextStore } from "../../lib/core/context";
import { LeContext } from "../../lib";

const contextElement = document.querySelector<LeContext>(
  "le-context#test-context"
);

if (contextElement !== null) {
  setTimeout(() => {
    contextElement.context = new ContextStore(
      { testing: true },
      contextElement
    );
  }, 1000);
}
