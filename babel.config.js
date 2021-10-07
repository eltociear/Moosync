module.exports = {
  plugins: [
    ["@babel/plugin-transform-runtime",
      {
        "regenerator": true,
      }]
  ],
  presets: [
    '@vue/cli-plugin-babel/preset',
    ["@babel/preset-env", {
      modules: false
    }]
  ]
}
