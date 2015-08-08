/* eslint es6: false */
var webpack = require('webpack');

var devConfig = {
  entry: './dev/index.js',
  output: {
    filename: 'metadata-dev.js',
    libraryTarget: 'umd',
  },
  module: {
    loaders: [
      { test: /\.js$/, exclude: /webpack/, loader: 'babel?stage=0' },
    ],
  },
};

var buildConfig = {
  entry: './src/index.js',
  output: {
    filename: 'index.js',
    libraryTarget: 'umd',
  },
  module: {
    loaders: [
      { test: /\.js$/, exclude: /webpack/, loader: 'babel?stage=0' },
    ],
  },
  externals: 'PhyloCanvas',
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compressor: {
        warnings: false
      }
    })
  ]
};

var isBuild = process.env.NODE_ENV && process.env.NODE_ENV === 'production';

module.exports = isBuild ? buildConfig : devConfig;
