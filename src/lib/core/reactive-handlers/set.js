"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactiveSet = reactiveSet;
function reactiveSet(matches, instance) {
    for (var _i = 0, matches_1 = matches; _i < matches_1.length; _i++) {
        var match = matches_1[_i];
        var matchValue = match.value;
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
