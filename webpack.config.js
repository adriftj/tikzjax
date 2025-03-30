const webpack = require('webpack');
const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

const baseConfig = {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  entry: './src/index.js',
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
  plugins: [
    new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
    }),
  ]
};

const umdConfig = merge(baseConfig, {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'tikzjax.js',
    library: {
      type: 'umd',
      umdNamedDefine: false
    },
    globalObject: 'this'
  },
  target: 'web',
});

const esmConfig = merge(baseConfig, {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'tikzjax.mjs',
    library: {
      type: 'module'
    }
  },
  experiments: {
    outputModule: true
  },
  target: ['web', 'es5']
});

module.exports = [umdConfig, esmConfig];
