export function reactiveSet(matches, instance) {
    for (const match of matches) {
        let matchValue = match.value;
        if ((matchValue === null || matchValue === void 0 ? void 0 : matchValue.startsWith("{")) && (matchValue === null || matchValue === void 0 ? void 0 : matchValue.endsWith("}"))) {
            // Value is a context lookup and we need to fetch it
            matchValue = instance.getStateValue(matchValue, match.element);
        }
        switch (match.localName) {
            case "text":
                match.element.textContent = matchValue;
                break;
            // case "template":
            // case "popover":
            default:
                break;
        }
    }
}
