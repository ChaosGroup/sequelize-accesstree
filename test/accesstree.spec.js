'use strict';

const expect = require('./testSetup');
const defaultConnectionSetup = require('./dbsetupandteardown');
const _ = require('lodash');

const db = require('./dbinit');
const AccessTree = db.AccessTree;
const Users = require('./Users');

const AccessTreeGrant = db.sequelize.models.AccessTreeGrant;
const treeSetup = require('./treeSetup');

describe('Access Tree with example model', function () {
	defaultConnectionSetup();

	let nodes;

	beforeEach(function* () {
		nodes = yield treeSetup(AccessTree, AccessTreeGrant);
	});

	it('can get all the nodes', function* () {
		let result = yield AccessTree.scope('withgrants').findAll();
		expect(result).to.be.an('array').with.length(Object.keys(nodes).length);
		expect(_.map(result, 'id')).to.have.members(_.map(nodes, 'id'));
	});

	it('has grant to peter for role manager', function* () {
		let alpha = yield AccessTree.scope('withgrants').findById(nodes.alpha.id);

		expect(alpha.AccessTreeGrants).to.be.an('array').with.length(1);

		let aGrant = alpha.AccessTreeGrants[0];
		expect(aGrant).to.have.property('UserId', Users.peter);
		expect(aGrant).to.have.property('role', 'manager');
	});

	it('returns all grants for object with multiple grants', function* () {
		let betaSalesAmericas = yield AccessTree.scope('withgrants').findById(nodes.betaSalesAmericas.id);
		let grants = betaSalesAmericas.AccessTreeGrants;
		expect(grants).to.be.an('array').with.length(2);
		expect(_.map(grants, 'UserId')).to.have.members([Users.eve, Users.peter]);
	});

	it('returns subtree with grants', function* () {
		let beta = yield AccessTree.scope('fullChildTree').findOne({
			where: {
				id: nodes.beta.id
			}
		});

		expect(beta.AccessTreeGrants).to.be.an('array').with.length(2);
		expect(beta.children).to.be.an('array').with.length(1);

		let sales = beta.children[0];
		expect(sales.name).to.equal('Sales');
		expect(sales.AccessTreeGrants).to.be.an('array').with.length(1);

		expect(sales.children).to.be.an('array').with.length(1);
	});


	it('returns with direct children and grants', function* () {
		let beta = yield AccessTree.scope('fullChildren').findOne({
			where: {
				id: nodes.beta.id
			}
		});

		expect(beta.AccessTreeGrants).to.be.an('array').with.length(2);
		expect(beta.children).to.be.an('array').with.length(1);

		let sales = beta.children[0];
		expect(sales.name).to.equal('Sales');
		expect(sales.AccessTreeGrants).to.be.an('array').with.length(1);

		expect(sales.children).to.be.undefined;
	});

	describe('#childFolders', function () {
		it('returns betaSales with one child when asked for beta\'s children', function* () {
			let actual = yield AccessTree.childFolders(nodes.beta.id);

			expect(actual).to.be.an('array').with.length(1);
			expect(actual[0].id).to.equal(nodes.betaSales.id);
			expect(actual[0].children).to.be.undefined;
		});

		it('returns gamaSales with one child and gamaProcurement with 0 children when asked for gama\'s children', function* () {
			let actual = yield AccessTree.childFolders(nodes.gama.id);

			expect(actual).to.be.an('array').with.length(2);

			expect(_.map(actual, 'id')).to.have.members([nodes.gamaProcurement.id, nodes.gamaSales.id]);
			expect(_.map(actual, 'subfolderCount')).to.have.members([0, 2]);
			expect(_.map(actual, 'children')).to.have.members([undefined, undefined]);
		});

		it('returns no results for gamaSalesLondonCopenhagen', function* () {
			let actual = yield AccessTree.childFolders(nodes.gamaSalesLondonCopenhagen.id);
			expect(actual).to.be.an('array').with.length(0);
		});
	});

	describe('#rolesFor', function () {
		it('gives peter\'s roles in gamaSalesLondonNewYork', function* () {
			const actual = yield AccessTree.rolesFor(nodes.gamaSalesLondonNewYork.id, Users.peter);
			console.log(actual);
			expect(actual).to.have.members(['manager']);
		});
		it('gives george\'s roles in gamaSalesLondonNewYork', function* () {
			const actual = yield AccessTree.rolesFor(nodes.gamaSalesLondonNewYork.id, Users.george);
			expect(actual).to.have.members(['manager']);
		});
		it('gives ivan\'s roles in gamaSalesLondonNewYork', function* () {
			const actual = yield AccessTree.rolesFor(nodes.gamaSalesLondonNewYork.id, Users.ivan);
			expect(actual).to.have.members([]);
		});
		it('gives malory\'s roles in gamaSalesLondonNewYork', function* () {
			const actual = yield AccessTree.rolesFor(nodes.gamaSalesLondonNewYork.id, Users.malory);
			expect(actual).to.have.members(['assistant']);
		});
		it('gives eve\'s roles in gamaSalesLondonNewYork', function* () {
			const actual = yield AccessTree.rolesFor(nodes.gamaSalesLondonNewYork.id, Users.eve);
			expect(actual).to.have.members([]);
		});
	});

	describe('rootId', function () {
		it('is pointing to the tree root in all nodes when they are created', function* () {
			let values = yield AccessTree.findAll({
				where: {
					parentId: null
				},
				include: [{
					model: AccessTree,
					as: 'descendents'
				}]
			});

			expect(values).to.be.an('array').with.length(3);
			values.forEach(function (root) {
				expect(root.rootId).to.be.null;
				expect(root.descendents).to.be.an('array');
				root.descendents.forEach(function (descendant) {
					expect(descendant.rootId).to.equal(root.id);
				});
			});
		});
	})
});
