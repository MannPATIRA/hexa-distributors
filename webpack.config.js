const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

const isDev = process.env.NODE_ENV !== "production";

module.exports = {
  mode: isDev ? "development" : "production",
  devtool: isDev ? "inline-source-map" : "source-map",
  entry: isDev
    ? ["webpack-hot-middleware/client?reload=true", "./src/addin/index.tsx"]
    : ["./src/addin/index.tsx"],
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "taskpane.js",
    publicPath: "/",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            compilerOptions: {
              module: "esnext",
              moduleResolution: "node",
            },
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: "asset/resource",
        generator: {
          filename: "assets/[name][ext]",
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/addin/taskpane.html",
      filename: "taskpane.html",
      inject: "body",
      scriptLoading: "blocking",
    }),
    ...(isDev ? [new webpack.HotModuleReplacementPlugin()] : []),
  ],
};
