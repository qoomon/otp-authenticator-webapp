const webpack = require('webpack');
const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const gitRevision = require('git-revision');
const packageFile = require('./package.json');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  context: path.join(__dirname, 'app'),
  entry: './index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: './*.ico' },
        { from: './*.png' },
        { from: './*.css' },
        { from: './*.html' }
      ],
      options: {
        concurrency: 100,
      },
    }),
    new webpack.DefinePlugin({
      APP: JSON.stringify({
        version: packageFile.version + '-' + gitRevision('hash')
      }),
    })
  ]
};