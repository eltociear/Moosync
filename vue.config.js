const webpack = require('webpack');
const ThreadsPlugin = require('threads-plugin')
const dotenv = require('dotenv').config({ path: __dirname + '/config.env' });
const fs = require('fs')

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const archElectronConfig = {}
if (fs.existsSync('/usr/lib/electron') && fs.existsSync('/usr/lib/electron/version')) {
  archElectronConfig.electronDist = '/usr/lib/electron'
  archElectronConfig.electronVersion = fs.readFileSync('/usr/lib/electron/version', { encoding: 'utf-8' }).replace('v', '')
}

const secrets = {}
if (dotenv.parsed) {
  secrets['process.env.YoutubeClientID'] = JSON.stringify(dotenv.parsed['YOUTUBECLIENTID'])
  secrets['process.env.YoutubeClientSecret'] = JSON.stringify(dotenv.parsed['YOUTUBECLIENTSECRET'])
  secrets['process.env.LastFmApiKey'] = JSON.stringify(dotenv.parsed['LASTFMAPIKEY'])
  secrets['process.env.LastFmSecret'] = JSON.stringify(dotenv.parsed['LASTFMSECRET'])
}

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
        ...secrets
      }),
    ],
    externals: { 'better-sqlite3': 'commonjs better-sqlite3', "vm2": "require('vm2')" },
    devtool: 'source-map'
  },
  pluginOptions: {
    electronBuilder: {
      mainProcessWatch: ['src/utils/main', 'src/utils/extensions'],
      customFileProtocol: 'moosync://./',
      builderOptions: {
        ...archElectronConfig,
        productName: 'Moosync',
        mac: {
          icon: "build/icons//512x512.png",
        },
        linux: {
          target: ['AppImage', 'deb', 'tar.gz', 'pacman']
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
              "moosync"
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