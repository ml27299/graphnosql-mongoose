const nodeExternals = require("webpack-node-externals");
// const webpack = require("webpack");
const path = require("path");

const { NODE_ENV } = process.env;
module.exports = {
	target: "node",
	optimization: {
		minimize: false,
	},
	entry: {
		index: path.resolve(__dirname, "index.js"),
	},
	devtool: "source-map",
	externalsPresets: { node: true },
	externals: [nodeExternals()],
	mode: NODE_ENV === "production" ? "production" : "development",
	// plugins: [
	// 	new webpack.DefinePlugin({
	// 		"process.env": JSON.stringify({}),
	// 	}),
	// ].filter(Boolean),
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "babel-loader",
					},
				],
			},
			{
				test: /\.graphql$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "graphql-tag/loader",
					},
				],
			},
		],
	},
	node: {
		__filename: true,
		__dirname: true,
	},
	output: {
		path: path.resolve("dist"),
		filename: "[name].js",
		libraryTarget: "commonjs2",
		sourceMapFilename: "[file].map",
	},
};
