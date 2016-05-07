var webpack = require('webpack');
var ExtractText = require("extract-text-webpack-plugin");
// var copy = require("copy-webpack-plugin");

module.exports = {
    entry:  [
        './web/modules/js/index.js',
        './web/modules/scss/index.scss',
    ],
    output: {
        path:     'web/static',
        filename: 'client.js',
    },
    module: {
        loaders: [
            {
                test:   /\.js/,
                loader: 'babel',
                include: __dirname + '/web/modules',
                query: {
                    presets: ['es2015'],
                }
            },
            {
                test: /\.scss/,
                loader: ExtractText.extract('style', 'css!sass')
            },
            { test: /\.json$/, loader: 'json' },
        ],
    },
    plugins: [
        new ExtractText('style.css'),
        // new copy([
        //     { from: './build', to: '../../website/static'},
        // ]),
        // new webpack.ProvidePlugin({
        //     $: "jquery",
        //     jQuery: "jquery"
        // })
    ]
};