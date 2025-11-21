// Add TextEncoder/TextDecoder for Node.js environment
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set up global variables for the app
global.__SERVER__ = false;
global.__DEVELOPMENT__ = false;

const DATE_TO_USE = new Date('2017-05-11');
const _Date = Date;

// Create a proper Date mock that preserves all Date functionality
class MockDate extends _Date {
  constructor(...args) {
    if (args.length === 0) {
      super(DATE_TO_USE);
    } else {
      super(...args);
    }
  }
}

// Copy all static methods
MockDate.UTC = _Date.UTC;
MockDate.parse = _Date.parse;
MockDate.now = jest.fn(() => DATE_TO_USE.getTime());

global.Date = MockDate;
