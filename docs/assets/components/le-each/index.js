import LogicalElement from "../../core/logical-element";
/** Can be provided a list and for each item in the list will iterate over a template. */
class LeEach extends LogicalElement {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "renderedItemCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
    }
    get template() {
        return this.querySelector("template");
    }
    get isEmpty() {
        if (this.list.length <= 0) {
            return true;
        }
        return false;
    }
    get list() {
        const attributeValue = this.getAttribute("list");
        const stateValue = this.getStateValue(attributeValue, this);
        if (!Array.isArray(stateValue)) {
            return [];
        }
        return stateValue;
    }
    onParsed() {
        this.renderEach();
    }
    onProviderUpdated() {
        if (this.renderedItemCount !== this.list.length) {
            this.renderEach();
        }
    }
    renderEach() {
        const list = this.list;
        const template = this.template;
        const variableName = this.getAttribute("as");
        const container = this.querySelector("[data-apply-template]");
        if (container === null ||
            !(template instanceof HTMLTemplateElement) ||
            typeof variableName !== "string") {
            // Nothing to iterate on
            return;
        }
        const fragment = document.createDocumentFragment();
        Array.from(container.childNodes).forEach((childNode) => childNode.remove());
        // Render the template
        for (const key of list.keys()) {
            const clone = document.importNode(template.content, true);
            this.eachChild((currentChild) => {
                for (const attribute of currentChild.attributes) {
                    if (attribute.value === `${variableName}.index`) {
                    }
                    else if (attribute.value.startsWith(`{${variableName}`) && attribute.value.endsWith("}")) {
                        const listPath = this.getAttribute("list").slice(1, -1);
                        const newPath = attribute.value.replace(variableName, `${listPath}.${key}`);
                        attribute.value = newPath;
                    }
                }
            }, clone);
            fragment.appendChild(clone);
        }
        this.renderedItemCount = list.length;
        container.appendChild(fragment);
    }
}
Object.defineProperty(LeEach, "observedAttributes", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: ["as", "list"]
});
export default LeEach;
window.customElements.define("le-each", LeEach);
