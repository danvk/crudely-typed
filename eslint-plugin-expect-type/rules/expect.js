"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rule = exports.name = void 0;
const typescript_1 = __importDefault(require("typescript"));
const createRule_1 = require("../utils/createRule");
const getParserServices_1 = require("../utils/getParserServices");
const loc_1 = require("../utils/loc");
const snapshot_1 = require("../utils/snapshot");
const messages = {
    TypeScriptCompileError: 'TypeScript compile error: {{ message }}',
    FileIsNotIncludedInTsconfig: 'Expected to find a file "{{ fileName }}" present.',
    TypesDoNotMatch: 'Expected type to be: {{ expected }}, got: {{ actual }}',
    OrphanAssertion: 'Can not match a node to this assertion.',
    Multiple$ExpectTypeAssertions: 'This line has 2 or more $ExpectType assertions.',
    ExpectedErrorNotFound: 'Expected an error on this line, but found none.',
    TypeSnapshotNotFound: 'Type Snapshot not found. Please consider running ESLint in FIX mode: eslint --fix',
    TypeSnapshotDoNotMatch: 'Expected type from Snapshot to be: {{ expected }}, got: {{ actual }}',
    SyntaxError: 'Syntax Error: {{ message }}',
};
// The default options for the rule.
const defaultOptions = {
    // expectError: true,
    // expectType: true,
    // expectTypeSnapshot: true,
    disableExpectTypeSnapshotFix: false,
};
// The schema for the rule options.
const schema = [
    {
        type: 'object',
        properties: {
            // expectError: {
            //   type: 'boolean',
            // },
            // expectType: {
            //   type: 'boolean',
            // },
            // expectTypeSnapshot: {
            //   type: 'boolean',
            // },
            disableExpectTypeSnapshotFix: {
                type: 'boolean',
            },
        },
        additionalProperties: false,
    },
];
exports.name = 'expect';
exports.rule = (0, createRule_1.createRule)({
    name: exports.name,
    meta: {
        type: 'problem',
        docs: {
            description: 'Expects type error, type snapshot or type.',
            recommended: 'error',
            requiresTypeChecking: true,
        },
        fixable: 'code',
        schema,
        messages,
    },
    defaultOptions: [defaultOptions],
    create(context, [options]) {
        validate(context, options);
        return {};
    },
});
function validate(context, options) {
    const parserServices = (0, getParserServices_1.getParserServices)(context);
    const { program } = parserServices;
    const fileName = context.getFilename();
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) {
        context.report({
            loc: {
                line: 1,
                column: 0,
            },
            messageId: 'FileIsNotIncludedInTsconfig',
            data: {
                fileName,
            },
        });
        return;
    }
    const checker = program.getTypeChecker();
    const languageService = typescript_1.default.createLanguageService(getLanguageServiceHost(program));
    // Don't care about emit errors.
    const diagnostics = typescript_1.default.getPreEmitDiagnostics(program, sourceFile);
    if (sourceFile.isDeclarationFile || !/(?:\$Expect(Type|Error|^\?))|\^\?/.test(sourceFile.text)) {
        // Normal file.
        for (const diagnostic of diagnostics) {
            addDiagnosticFailure(diagnostic);
        }
        return;
    }
    const { errorLines, typeAssertions, twoSlashAssertions, duplicates, syntaxErrors } = parseAssertions(sourceFile);
    for (const line of duplicates) {
        context.report({
            messageId: 'Multiple$ExpectTypeAssertions',
            loc: {
                line: line + 1,
                column: 0,
            },
        });
    }
    const seenDiagnosticsOnLine = new Set();
    for (const diagnostic of diagnostics) {
        const line = lineOfPosition(diagnostic.start, sourceFile);
        seenDiagnosticsOnLine.add(line);
        if (!errorLines.has(line)) {
            addDiagnosticFailure(diagnostic);
        }
    }
    for (const line of errorLines) {
        if (!seenDiagnosticsOnLine.has(line)) {
            context.report({
                messageId: 'ExpectedErrorNotFound',
                loc: {
                    line: line + 1,
                    column: 0,
                },
            });
        }
    }
    for (const { type, line } of syntaxErrors) {
        context.report({
            messageId: 'SyntaxError',
            data: {
                message: type === 'MissingExpectType'
                    ? '$ExpectType requires type argument (e.g. // $ExpectType "string")'
                    : '$ExpectTypeSnapshot requires snapshot name argument (e.g. // $ExpectTypeSnapshot MainComponentAPI)',
            },
            loc: {
                line: line + 1,
                column: 0,
            },
        });
    }
    for (const [, assertion] of typeAssertions) {
        if (assertion.assertionType === 'snapshot') {
            assertion.expected = (0, snapshot_1.getTypeSnapshot)(fileName, assertion.snapshotName);
        }
    }
    const { unmetExpectations, unusedAssertions } = getExpectTypeFailures(sourceFile, { typeAssertions, twoSlashAssertions }, checker, languageService);
    for (const { node, assertion, actual } of unmetExpectations) {
        const templateDescriptor = {
            data: {
                expected: assertion.expected,
                actual,
            },
            loc: (0, loc_1.loc)(sourceFile, node),
        };
        if (assertion.assertionType === 'snapshot') {
            const { snapshotName } = assertion;
            const start = node.getStart();
            const fix = () => {
                let applied = false;
                return {
                    range: [start, start],
                    // Bug: previously, ESLint would only read RuleFix objects if `--fix` is passed. Now it seems to no matter what.
                    // TODO: See if we can only update snapshots if `--fix` is passed?
                    // See: https://github.com/JoshuaKGoldberg/eslint-plugin-expect-type/issues/14
                    get text() {
                        if (!applied) {
                            // Make sure we update snapshot only on first read of this object
                            applied = true;
                            if (!options.disableExpectTypeSnapshotFix) {
                                (0, snapshot_1.updateTypeSnapshot)(fileName, snapshotName, actual);
                            }
                        }
                        return '';
                    },
                };
            };
            if (typeof assertion.expected === 'undefined') {
                context.report(Object.assign(Object.assign({}, templateDescriptor), { messageId: 'TypeSnapshotNotFound', fix }));
            }
            else {
                context.report(Object.assign(Object.assign({}, templateDescriptor), { messageId: 'TypeSnapshotDoNotMatch', fix }));
            }
        }
        else {
            context.report(Object.assign(Object.assign(Object.assign({}, templateDescriptor), { messageId: 'TypesDoNotMatch' }), (assertion.assertionType === 'twoslash'
                ? {
                    fix: () => {
                        const { expectedRange, expectedPrefix, insertSpace } = assertion;
                        return {
                            range: expectedRange,
                            text: (insertSpace ? ' ' : '') +
                                actual
                                    .split('\n')
                                    .map((line, i) => (i > 0 ? expectedPrefix + line : line))
                                    .join('\n'),
                        };
                    },
                }
                : {})));
        }
    }
    for (const line of unusedAssertions) {
        context.report({
            messageId: 'OrphanAssertion',
            loc: {
                line: line + 1,
                column: 0,
            },
        });
    }
    function diagnosticShouldBeIgnored(diagnostic) {
        const messageText = typeof diagnostic.messageText === 'string' ? diagnostic.messageText : diagnostic.messageText.messageText;
        return /'.+' is declared but (never used|its value is never read)./.test(messageText);
    }
    function addDiagnosticFailure(diagnostic) {
        if (diagnosticShouldBeIgnored(diagnostic)) {
            return;
        }
        if (diagnostic.file === sourceFile) {
            const message = `${typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
            context.report({
                messageId: 'TypeScriptCompileError',
                data: {
                    message,
                },
                loc: {
                    line: diagnostic.start + 1,
                    column: diagnostic.length,
                },
            });
        }
        else {
            context.report({
                messageId: 'TypeScriptCompileError',
                data: {
                    message: `${fileName}${diagnostic.messageText}`,
                },
                loc: {
                    line: 1,
                    column: 0,
                },
            });
        }
    }
}
function parseAssertions(sourceFile) {
    var _a;
    const errorLines = new Set();
    const typeAssertions = new Map();
    const duplicates = [];
    const syntaxErrors = [];
    const twoSlashAssertions = [];
    const { text } = sourceFile;
    const commentRegexp = /\/\/(.*)/g;
    const lineStarts = sourceFile.getLineStarts();
    let curLine = 0;
    while (true) {
        const commentMatch = commentRegexp.exec(text);
        if (commentMatch === null) {
            break;
        }
        // Match on the contents of that comment so we do nothing in a commented-out assertion,
        // i.e. `// foo; // $ExpectType number`
        const match = /^( *)(?:(\$Expect(?:TypeSnapshot|Type|Error))|(\^\?))(?: (.*))?$/.exec(commentMatch[1]);
        if (match === null) {
            continue;
        }
        const commentCol = commentMatch.index;
        const line = getLine(commentCol);
        const whitespace = match[1];
        const directive = (_a = match[2]) !== null && _a !== void 0 ? _a : match[3];
        const payload = match[4];
        switch (directive) {
            case '$ExpectTypeSnapshot':
                const snapshotName = payload;
                if (snapshotName) {
                    if (typeAssertions.delete(line)) {
                        duplicates.push(line);
                    }
                    else {
                        typeAssertions.set(line, {
                            assertionType: 'snapshot',
                            snapshotName,
                        });
                    }
                }
                else {
                    syntaxErrors.push({
                        type: 'MissingSnapshotName',
                        line,
                    });
                }
                break;
            case '$ExpectError':
                if (errorLines.has(line)) {
                    duplicates.push(line);
                }
                errorLines.add(line);
                break;
            case '$ExpectType': {
                const expected = payload;
                if (expected) {
                    // Don't bother with the assertion if there are 2 assertions on 1 line. Just fail for the duplicate.
                    if (typeAssertions.delete(line)) {
                        duplicates.push(line);
                    }
                    else {
                        typeAssertions.set(line, { assertionType: 'manual', expected });
                    }
                }
                else {
                    syntaxErrors.push({
                        type: 'MissingExpectType',
                        line,
                    });
                }
                break;
            }
            case '^?': {
                // TODO: match error checking from ExpectType
                let expected = payload !== null && payload !== void 0 ? payload : '';
                if (line === 1) {
                    // This will become an attachment error later.
                    twoSlashAssertions.push({
                        position: -1,
                        expected,
                        expectedRange: [-1, -1],
                        expectedPrefix: '',
                        insertSpace: false,
                    });
                    break;
                }
                // // ^?
                // 01234 <-- so add three... but also subtract 1?
                const position = commentCol - lineStarts[line - 1] + lineStarts[line - 2] + whitespace.length + 2;
                const expectedRange = [
                    commentCol + whitespace.length + 5,
                    line < lineStarts.length ? lineStarts[line] - 1 : text.length,
                ];
                // Peak ahead to the next lines to see if the expected type continues
                const expectedPrefix = text.slice(lineStarts[line - 1], commentCol + 2 + whitespace.length) + '   ';
                for (let nextLine = line; nextLine < lineStarts.length; nextLine++) {
                    const thisLineEnd = nextLine + 1 < lineStarts.length ? lineStarts[nextLine + 1] - 1 : text.length;
                    const lineText = text.slice(lineStarts[nextLine], thisLineEnd + 1);
                    if (lineText.startsWith(expectedPrefix)) {
                        if (nextLine === line) {
                            expected += '\n';
                        }
                        expected += lineText.slice(expectedPrefix.length);
                        expectedRange[1] = thisLineEnd;
                    }
                    else {
                        break;
                    }
                }
                let insertSpace = false;
                if (expectedRange[0] > expectedRange[1]) {
                    // this happens if the line ends with "^?" and nothing else
                    expectedRange[0] = expectedRange[1];
                    insertSpace = true;
                }
                twoSlashAssertions.push({ position, expected, expectedRange, expectedPrefix, insertSpace });
                break;
            }
        }
    }
    return { errorLines, typeAssertions, duplicates, twoSlashAssertions, syntaxErrors };
    function getLine(pos) {
        // advance curLine to be the line preceding 'pos'
        while (lineStarts[curLine + 1] <= pos) {
            curLine++;
        }
        // If this is the first token on the line, it applies to the next line.
        // Otherwise, it applies to the text to the left of it.
        return isFirstOnLine(text, lineStarts[curLine], pos) ? curLine + 1 : curLine;
    }
}
function isFirstOnLine(text, lineStart, pos) {
    for (let i = lineStart; i < pos; i++) {
        if (text[i] !== ' ') {
            return false;
        }
    }
    return true;
}
function matchReadonlyArray(actual, expected) {
    if (!(/\breadonly\b/.test(actual) && /\bReadonlyArray\b/.test(expected)))
        return false;
    const readonlyArrayRegExp = /\bReadonlyArray</y;
    const readonlyModifierRegExp = /\breadonly /y;
    // A<ReadonlyArray<B<ReadonlyArray<C>>>>
    // A<readonly B<readonly C[]>[]>
    let expectedPos = 0;
    let actualPos = 0;
    let depth = 0;
    while (expectedPos < expected.length && actualPos < actual.length) {
        const expectedChar = expected.charAt(expectedPos);
        const actualChar = actual.charAt(actualPos);
        if (expectedChar === actualChar) {
            expectedPos++;
            actualPos++;
            continue;
        }
        // check for end of readonly array
        if (depth > 0 &&
            expectedChar === '>' &&
            actualChar === '[' &&
            actualPos < actual.length - 1 &&
            actual.charAt(actualPos + 1) === ']') {
            depth--;
            expectedPos++;
            actualPos += 2;
            continue;
        }
        // check for start of readonly array
        readonlyArrayRegExp.lastIndex = expectedPos;
        readonlyModifierRegExp.lastIndex = actualPos;
        if (readonlyArrayRegExp.test(expected) && readonlyModifierRegExp.test(actual)) {
            depth++;
            expectedPos += 14; // "ReadonlyArray<".length;
            actualPos += 9; // "readonly ".length;
            continue;
        }
        return false;
    }
    return true;
}
function getLanguageServiceHost(program) {
    return {
        getCompilationSettings: () => program.getCompilerOptions(),
        getCurrentDirectory: () => program.getCurrentDirectory(),
        getDefaultLibFileName: () => 'lib.d.ts',
        getScriptFileNames: () => program.getSourceFiles().map((sourceFile) => sourceFile.fileName),
        getScriptSnapshot: (name) => { var _a, _b; return typescript_1.default.ScriptSnapshot.fromString((_b = (_a = program.getSourceFile(name)) === null || _a === void 0 ? void 0 : _a.text) !== null && _b !== void 0 ? _b : ''); },
        getScriptVersion: () => '1',
    };
}
function getExpectTypeFailures(sourceFile, assertions, checker, languageService) {
    const { typeAssertions, twoSlashAssertions } = assertions;
    const unmetExpectations = [];
    // Match assertions to the first node that appears on the line they apply to.
    // `forEachChild` isn't available as a method in older TypeScript versions, so must use `ts.forEachChild` instead.
    typescript_1.default.forEachChild(sourceFile, function iterate(node) {
        const line = lineOfPosition(node.getStart(sourceFile), sourceFile);
        const assertion = typeAssertions.get(line);
        if (assertion !== undefined) {
            const { expected } = assertion;
            let nodeToCheck = node;
            // https://github.com/Microsoft/TypeScript/issues/14077
            if (node.kind === typescript_1.default.SyntaxKind.ExpressionStatement) {
                node = node.expression;
            }
            nodeToCheck = getNodeForExpectType(node);
            const type = checker.getTypeAtLocation(nodeToCheck);
            const actual = type
                ? checker.typeToString(type, /*enclosingDeclaration*/ undefined, typescript_1.default.TypeFormatFlags.NoTruncation)
                : '';
            if (!expected || (actual !== expected && !matchReadonlyArray(actual, expected))) {
                unmetExpectations.push({ assertion, node, actual });
            }
            typeAssertions.delete(line);
        }
        typescript_1.default.forEachChild(node, iterate);
    });
    const twoSlashFailureLines = [];
    if (twoSlashAssertions.length) {
        for (const assertion of twoSlashAssertions) {
            const { position, expected } = assertion;
            if (position === -1) {
                // special case for a twoslash assertion on line 1.
                twoSlashFailureLines.push(0);
                continue;
            }
            const node = getNodeAtPosition(sourceFile, position);
            if (!node) {
                twoSlashFailureLines.push(sourceFile.getLineAndCharacterOfPosition(position).line);
                continue;
            }
            const qi = languageService.getQuickInfoAtPosition(sourceFile.fileName, node.getStart());
            if (!qi || !qi.displayParts) {
                twoSlashFailureLines.push(sourceFile.getLineAndCharacterOfPosition(position).line);
                continue;
            }
            const actual = qi.displayParts.map((dp) => dp.text).join('');
            if (!matchModuloWhitespace(actual, expected)) {
                unmetExpectations.push({ assertion: Object.assign({ assertionType: 'twoslash' }, assertion), node, actual });
            }
        }
    }
    return { unmetExpectations, unusedAssertions: [...twoSlashFailureLines, ...typeAssertions.keys()] };
}
function getNodeAtPosition(sourceFile, position) {
    let candidate = null;
    typescript_1.default.forEachChild(sourceFile, function iterate(node) {
        const start = node.getStart();
        const end = node.getEnd();
        if (position >= start && position <= end) {
            candidate = node;
            typescript_1.default.forEachChild(node, iterate);
        }
    });
    return candidate;
}
function matchModuloWhitespace(actual, expected) {
    // TODO: it's much easier to normalize actual based on the displayParts
    //       This isn't 100% correct if a type has a space in it, e.g. type T = "string literal"
    const normActual = actual.replace(/[\n ]+/g, ' ').trim();
    const normExpected = expected.replace(/[\n ]+/g, ' ').trim();
    return normActual === normExpected;
}
function getNodeForExpectType(node) {
    if (node.kind === typescript_1.default.SyntaxKind.VariableStatement) {
        // ts2.0 doesn't have `isVariableStatement`
        const { declarationList: { declarations }, } = node;
        if (declarations.length === 1) {
            const { initializer } = declarations[0];
            if (initializer) {
                return initializer;
            }
        }
    }
    return node;
}
function lineOfPosition(pos, sourceFile) {
    return sourceFile.getLineAndCharacterOfPosition(pos).line;
}
