module.exports = {
  root: true,

  env: {
    node: true,
    browser: true,
    es6: true
  },

  plugins: ['unused-imports'],

  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022
  },

  rules: {
    'no-unused-vars': 0,
    semi: 'off',
    'no-extra-semi': 0,
    'no-undef': 0,
    'unused-imports/no-unused-imports': 'error',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  },

  extends: [
    'plugin:vue/essential',
    'eslint:recommended',
    '@vue/typescript',
    '@vue/typescript/recommended',
    'plugin:prettier/recommended'
  ]
}
