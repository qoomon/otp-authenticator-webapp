const webpack = require('webpack');
const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const packageFile = require('./package.json');
const gitRevision = require('git-revision');

module.exports = (env) => {
    env = env || 'dev';
    return {
        context: path.join(__dirname, 'app'),
        entry: './index.js',
        output: {
            filename: 'main.js',
            path: path.resolve(__dirname, 'dist')
        },

        plugins: [
            new CleanWebpackPlugin(),
            new CopyWebpackPlugin([
                {from: './*.ico'},
                {from: './*.png'},
                {from: './*.css'},
                {from: './*.html'}
            ]),
            new webpack.DefinePlugin({
                APP: JSON.stringify({
                    version: packageFile.version + '-' + gitRevision('hash')
                }),
            })
        ].filter((e) => e)
        // optimization: {
        //     minimizer: [
        //         new UglifyJsPlugin()
        //     ]
        // }
    }
};