"use strict";
const rules_1 = require("./rules");
const configs = Object.keys(rules_1.rules).reduce((acc, name) => (Object.assign(Object.assign({}, acc), { [`expect-type/${name}`]: 'error' })), {});
module.exports = {
    rules: rules_1.rules,
    configs: {
        recommended: {
            rules: configs,
        },
    },
};
