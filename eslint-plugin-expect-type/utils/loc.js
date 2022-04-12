"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loc = void 0;
const loc = (sourceFile, node) => {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return {
        start: {
            line: start.line + 1,
            column: start.character,
        },
        end: {
            line: end.line + 1,
            column: end.character,
        },
    };
};
exports.loc = loc;
