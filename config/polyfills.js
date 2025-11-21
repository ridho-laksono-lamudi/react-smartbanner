// Modern browsers support Promise and fetch natively
// Only polyfill Object.assign for compatibility
if (typeof Object.assign !== 'function') {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  Object.assign = require('object-assign');
}
