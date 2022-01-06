module.exports = {
  root: true,
    env: {
      node: true,
      browser: true,
      es6: true,
    },
    extends: [
      "plugin:vue/essential",
      "eslint:recommended",
      "@vue/typescript"
    ],
    parserOptions: {
      parser: "@typescript-eslint/parser",
    },
    rules: {
      'no-unused-vars': "off",
      semi: "off",
      'no-extra-semi': 1,
      'no-undef': 0
    }
}