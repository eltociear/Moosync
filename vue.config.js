const webpack = require('webpack');
const ThreadsPlugin = require('threads-plugin')
const dotenv = require('dotenv').config({ path: __dirname + '/config.env' });

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  runtimeCompiler: true,
  pages: {
    index: {
      entry: 'src/mainWindow/main.ts',
      template: 'public/index.html',
      filename: 'index.html',
    },
    preferenceWindow: {
      entry: 'src/preferenceWindow/main.ts',
      template: 'public/index.html',
      filename: 'preferenceWindow.html',
    }
  },
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        'process.browser': 'true',
        'process.env.YoutubeClientID': JSON.stringify(dotenv.parsed['YOUTUBECLIENTID']),
        'process.env.YoutubeClientSecret': JSON.stringify(dotenv.parsed['YOUTUBECLIENTSECRET']),
        'process.env.SpotifyClientID': JSON.stringify(dotenv.parsed['SPOTIFYCLIENTID']),
        'process.env.SpotifyClientSecret': JSON.stringify(dotenv.parsed['SPOTIFYCLIENTSECRET']),
        'process.env.LastFmApiKey': JSON.stringify(dotenv.parsed['LASTFMAPIKEY']),
        'process.env.LastFmSecret': JSON.stringify(dotenv.parsed['LASTFMSECRET'])

      }),

    ],
    externals: { 'better-sqlite3': 'commonjs better-sqlite3', "vm2": "require('vm2')" },
    devtool: 'source-map'
  },
  pluginOptions: {
    electronBuilder: {
      mainProcessWatch: ['src/utils/main', 'src/utils/extensions'],
      customFileProtocol: 'com.moosync://./',
      builderOptions: {
        productName: 'Moosync',
        mac: {
          icon: "build/icons//512x512.png",
        },
        linux: {
          target: ['AppImage', 'deb', 'tar.gz']
        },
        publish: [{
          provider: 'github',
          owner: 'Moosync',
          repo: 'moosync-app',
          vPrefixedTagName: true,
          releaseType: "draft"
        }],
        asarUnpack: ['*.worker.js', 'sandbox.js'],
        protocols: [
          {
            name: "Default protocol",
            schemes: [
              "com.moosync"
            ]
          }
        ]
      },
      nodeIntegration: false,
      disableMainProcessTypescript: false,
      mainProcessTypeChecking: true,
      preload: 'src/utils/preload/preload.ts',
      externals: [
        'better-sqlite3', 'vm2'
      ],
      chainWebpackMainProcess: (config) => {
        config.entry("sandbox").add(__dirname + '/src/utils/extensions/sandbox/index.ts').end()

        config.plugin('thread')
          .use(ThreadsPlugin, [{ target: 'electron-node-worker' }]);
      },
    },
    autoRouting: {
      pages: 'src/mainWindow/pages',
      importPrefix: '@/mainWindow/pages/',
      chunkNamePrefix: 'page-'
    }
  },
}
