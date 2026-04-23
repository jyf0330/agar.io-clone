module.exports = (isProduction) => ({
    entry: "./apps/client/src/app.js",
    mode: isProduction ? 'production' : 'development',
    output: {
        library: "app",
        filename: "app.js",
        assetModuleFilename: "assets/[name][ext]"
    },
    devtool: false,
    module: {
        rules: getRules(isProduction)
    },
});

function getRules(isProduction) {
    const rules = [
        {
            test: /\.(png|jpe?g|gif|svg)$/i,
            type: 'asset/resource'
        }
    ];

    if (isProduction) {
        rules.unshift({
            test: /\.(?:js|mjs|cjs)$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        ['@babel/preset-env', { targets: "defaults" }]
                    ]
                }
            }
        });
    }

    return rules;
}
