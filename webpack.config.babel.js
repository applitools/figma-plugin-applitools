const process = require('process');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin')
const InlineChunkHtmlPlugin = require('inline-chunk-html-plugin')
const webpack = require('webpack');


module.exports = (env, argv) =>  ({
  context: __dirname,
  //fix this
  mode: 'development',
  devtool: argv.mode === 'production' ? false : false,//'inline-source-map',

  entry: {
    ui: './src/ui.ts', // The entry point for your UI code
    plugin: './src/plugin.ts', // The entry point for your plugin code
    settings: './src/settings.ts', 
    //applitools: './src/applitools.ts'
  },
  output: {
    filename: '[name].js',
    path: path.join(process.cwd(), './dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        // I think we can uncomment this
        //exclude: /node_modules\/.*/,
        exclude: {
          and: [/node_modules/], // Exclude libraries in node_modules ...
          not: [
            // Except for a few of them that needs to be transpiled because they use modern syntax
            ///browser-process-hrtime/,
            ///d3-array|d3-scale/,
            ///@hapi[\\/]joi-date/,
          ]
        }
      },
      // Converts TypeScript code to JavaScript
      { 
        test: /\.tsx?$/, 
        use: 'ts-loader', 
        exclude: /node_modules.*/
      },
      // CSS and SCSS
      {
        test: /\.s?css$/,
        use: [
          'css-loader',
          'sass-loader',
        ]
      },
      // HTML
      /*{
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: {
              interpolate: true,
            },
          }
        ],
      },*/
    ]
  },
  resolve: {
    modules: ["node_modules"],
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.scss', '.html',],
    fallback: {
      module: false,
      child_process: false,
      vm: require.resolve("vm-browserify"),
      fs: require.resolve('./src/builtins/fs.js'),
      url: require.resolve('./src/builtins/url.js'),
      assert: require.resolve('assert/'),
      util: require.resolve('util/'),
      crypto: require.resolve('crypto-browserify'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      zlib: require.resolve('browserify-zlib'),
    },
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      inject: "body",
      template: './src/ui.html',
      filename: 'ui.html',
      chunks: ['ui']
    }),
    new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/ui/]),
    new CopyPlugin(
      { 
        patterns: [
          {from: './src/manifest.json', to: '.' }
        ]
      }),
    new webpack.ProvidePlugin({
      Buffer: [require.resolve('buffer'), 'Buffer'],
      process: [require.resolve('process/browser')],
      'process.hrtime': [require.resolve('./src/builtins/browser-process-hrtime.js')]

    }),
  ],
});
