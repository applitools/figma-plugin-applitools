module.exports = {
    comments: false,
    presets: ['@babel/preset-env'],
    plugins: [
      '@babel/plugin-transform-runtime',
      '@babel/plugin-transform-modules-commonjs',
      '@babel/plugin-proposal-object-rest-spread',
    ],
  }