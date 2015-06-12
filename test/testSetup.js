'use strict';

//chai assertion library
const chai = require('chai');

//sinon mock library integration. Use <code>const sinon = require('sinon');</code> to include it in your test
chai.use(require('sinon-chai'));

//this one allows using generator functions in tests, setup and teardown methods. See co library
require('co-mocha');

module.exports = chai.expect;
