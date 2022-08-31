const webpack = require('webpack')
const ThreadsPlugin = require('threads-plugin')
const dotenv = require('dotenv').config({ path: __dirname + '/config.env' })
const fs = require('fs')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { resolve } = require('path')
const manifest = require('./package.json')

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const archElectronConfig = {}

if (fs.existsSync('/usr/lib/electron') && fs.existsSync('/usr/lib/electron/version')) {
  archElectronConfig.electronDist = '/usr/lib/electron'
  archElectronConfig.electronVersion = fs
    .readFileSync('/usr/lib/electron/version', { encoding: 'utf-8' })
    .replace('v', '')
}

const RendererSecrets = {}
const MainSecrets = {}
if (dotenv.parsed) {
  RendererSecrets['process.env.YoutubeClientID'] = JSON.stringify(dotenv.parsed['YOUTUBECLIENTID'])
  RendererSecrets['process.env.YoutubeClientSecret'] = JSON.stringify(dotenv.parsed['YOUTUBECLIENTSECRET'])
  RendererSecrets['process.env.LastFmApiKey'] = JSON.stringify(dotenv.parsed['LASTFMAPIKEY'])
  RendererSecrets['process.env.LastFmSecret'] = JSON.stringify(dotenv.parsed['LASTFMSECRET'])
  MainSecrets['process.env.FanartTVApiKey'] = JSON.stringify(dotenv.parsed['FANARTTVAPIKEY'])
}

module.exports = {
  runtimeCompiler: true,
  pages: {
    index: {
      entry: 'src/mainWindow/main.ts',
      template: 'public/index.html',
      filename: 'index.html'
    },
    preferenceWindow: {
      entry: 'src/preferenceWindow/main.ts',
      template: 'public/index.html',
      filename: 'preferenceWindow.html'
    }
  },
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        'process.browser': 'true',
        'process.env.MOOSYNC_VERSION': JSON.stringify(manifest.version),
        ...RendererSecrets
      }),

      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer']
      })

      // new BundleAnalyzerPlugin()
    ],
    externals: {
      'better-sqlite3': 'commonjs better-sqlite3',
      vm2: "require('vm2')",
      sharp: "require('sharp')"
    },
    devtool: 'source-map',
    resolve: {
      fallback: {
        stream: require.resolve('stream-browserify'),
        fs: false,
        util: false,
        os: false,
        url: false,
        net: false,
        assert: false,
        crypto: false,
        dgram: false,
        buffer: require.resolve('buffer')
      }
    }
  },
  pluginOptions: {
    electronBuilder: {
      mainProcessWatch: ['src/utils/main', 'src/utils/extensions', 'src/utils/common.ts'],
      customFileProtocol: 'moosync://./',
      builderOptions: {
        ...archElectronConfig,
        appId: 'app.moosync.Moosync',
        productName: 'Moosync',
        artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
        icon: './build/icons/512x512.png',
        mac: {
          icon: './build/icons/icon.icns'
        },
        win: {
          verifyUpdateCodeSignature: false
        },
        linux: {
          icon: './build/icons/',
          target: ['AppImage', 'deb', 'tar.gz', 'pacman', 'snap', 'rpm']
        },
        nsis: {
          oneClick: false,
          perMachine: true
        },
        snap: {
          stagePackages: ['libnspr4', 'libnss3', 'libxss1', 'libappindicator3-1', 'libsecret-1-0']
        },
        deb: {
          depends: ['libnotify4', 'libxtst6', 'libnss3']
        },
        fileAssociations: [
          {
            ext: 'mp3',
            description: 'Music file extension',
            role: 'Viewer'
          },
          {
            ext: 'flac',
            description: 'Music file extension',
            role: 'Viewer'
          },
          {
            ext: 'aac',
            description: 'Music file extension',
            role: 'Viewer'
          },
          {
            ext: 'ogg',
            description: 'Music file extension',
            role: 'Viewer'
          },
          {
            ext: 'wav',
            description: 'Music file extension',
            role: 'Viewer'
          },
          {
            ext: 'm4a',
            description: 'Music file extension',
            role: 'Viewer'
          },
          {
            ext: 'webm',
            description: 'Music file extension',
            role: 'Viewer'
          },
          {
            ext: 'wv',
            description: 'Music file extension',
            role: 'Viewer'
          }
        ],
        publish: [
          {
            provider: 'github',
            owner: 'Moosync',
            repo: 'Moosync',
            vPrefixedTagName: true,
            releaseType: 'draft'
          },
          {
            provider: 'snapStore',
            repo: 'moosync'
          }
        ],
        asarUnpack: ['*.worker.js', 'sandbox.js', '**/node_modules/**/*.node'],
        protocols: [
          {
            name: 'Default protocol',
            schemes: ['moosync']
          }
        ],
        beforeBuild: 'scripts/fontFix.js'
      },
      nodeIntegration: false,
      disableMainProcessTypescript: false,
      mainProcessTypeChecking: true,
      preload: 'src/utils/preload/preload.ts',
      externals: ['better-sqlite3', 'vm2', 'sharp'],
      chainWebpackMainProcess: (config) => {
        config.devtool('source-map').end()
        config.module
          .rule('babel')
          .before('ts')
          .exclude.add(/node_modules|regenerator-runtime|core-js|webpack/)
          .end()
          .use('babel')
          .loader('babel-loader')
          .options({
            presets: [['@babel/preset-env', { modules: false }]],
            plugins: [
              '@babel/plugin-proposal-class-properties',
              ['@babel/plugin-transform-runtime', { regenerator: true }],
              '@babel/plugin-syntax-bigint'
            ]
          })

        config.plugin('define').tap((args) => {
          args[0] = {
            ...args[0],
            'process.env.MOOSYNC_VERSION': JSON.stringify(manifest.version),
            ...MainSecrets
          }

          return args
        })

        config
          .entry('sandbox')
          .add(__dirname + '/src/utils/extensions/sandbox/index.ts')
          .end()
        config.plugin('thread').use(ThreadsPlugin, [{ target: 'electron-node-worker' }])

        config.plugin('copy').use(CopyWebpackPlugin, [{ patterns: [{ from: resolve('dev-app-update.yml') }] }])

        // config.plugin('copy').use(BundleAnalyzerPlugin)
      }
    }
  }
}
