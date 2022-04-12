"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTypeSnapshot = exports.getTypeSnapshot = void 0;
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const getTypeSnapshot = (filename, snapshotName) => {
    const snapshotPath = getSnapshotPath(filename);
    const json = (0, fs_extra_1.readJsonSync)(snapshotPath, { throws: false });
    if (!json) {
        return;
    }
    return json[snapshotName];
};
exports.getTypeSnapshot = getTypeSnapshot;
const updateTypeSnapshot = (filename, snapshotName, actualType) => {
    const snapshotPath = getSnapshotPath(filename);
    (0, fs_extra_1.ensureFileSync)(snapshotPath);
    const json = (0, fs_extra_1.readJsonSync)(snapshotPath, { throws: false }) || {};
    json[snapshotName] = actualType;
    (0, fs_extra_1.writeJsonSync)(snapshotPath, json, { spaces: 2 });
};
exports.updateTypeSnapshot = updateTypeSnapshot;
function getSnapshotPath(filename) {
    const directory = (0, path_1.dirname)(filename);
    return (0, path_1.resolve)(directory, '__type-snapshots__', `${(0, path_1.basename)(filename)}.snap.json`);
}
