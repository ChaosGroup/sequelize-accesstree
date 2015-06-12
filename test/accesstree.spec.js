'use strict';

const expect = require('./testSetup');
const defaultConnectionSetup = require('./dbsetupandteardown');
//const _ = require('lodash');

const db = require('./dbinit');
const AccessTree = db.AccessTree;
const Users = require('./Users');
const AccessTreeGrants = db.sequelize.models.AccessTreeGrants;

describe('Access Tree with example model', function () {
	defaultConnectionSetup();

	it('is working so far', function () {

	});
});
