const webpack = require('webpack');
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'tikzjax.js',
  },
  resolve: {
    alias: {
      'fs': 'browserfs/dist/shims/fs.js',
      'path': 'browserfs/dist/shims/path.js',
      'bfsGlobal': require.resolve('browserfs'),
    },
    fallback: {
      buffer: require.resolve('buffer/'),
    },
  },  
  target: 'web',
  plugins: [
    new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
    }),
  ]
};
