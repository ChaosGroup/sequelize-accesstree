'use strict';

const expect = require('./testSetup');
const defaultConnectionSetup = require('./dbsetupandteardown');
const _ = require('lodash');

const db = require('./dbinit');
const AccessTree = db.AccessTree;
const Users = require('./Users');

const AccessTreeGrants = db.sequelize.models.AccessTreeGrant;
const treeSetup = require('./treeSetup');

describe('Access Tree with example model', function () {
	defaultConnectionSetup();

	let nodes;

	beforeEach(function* () {
		nodes = yield treeSetup(AccessTree, AccessTreeGrants);
	});

	it('can get all the nodes', function* () {
		let result = yield AccessTree.scope('withgrants').findAll();
		expect(result).to.be.an('array').with.length(Object.keys(nodes).length);
		expect(_.map(result, 'id')).to.have.members(_.map(nodes, 'id'));
	});
});
