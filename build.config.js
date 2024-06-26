const path = require('path');
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'fingerprint'),
    libraryTarget: 'window',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: ['ts-loader'],
        exclude: /node-modules/,
      },
    ],
  },
  plugins: [
    new WebpackObfuscator({
      rotateStringArray: true,
      splitStringsChunkLength: 5,
    }),
  ],
};
