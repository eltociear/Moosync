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
  plugins: ["unused-imports"],
  parserOptions: {
    parser: "@typescript-eslint/parser",
  },
  rules: {
    'no-unused-vars': 0,
    semi: "off",
    'no-extra-semi': 0,
    'no-undef': 0,
    "unused-imports/no-unused-imports": "error",
  }
}