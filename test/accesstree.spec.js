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

		it('returns gamaSales with one child and gamaProcurement with 0 children when asked for gama\'s children',
			function* () {
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

	describe('#authzDetailsFor', function () {
		it('gives peter\'s roles in gamaSalesLondonNewYork', function* () {
			const actual = yield AccessTree.authzDetailsFor(nodes.gamaSalesLondonNewYork.id, Users.peter);
			expect(actual.roles).to.have.members(['manager']);
			expect(actual.type).to.equal('filetype2');
		});
	});

	describe('#rolesFor', function () {
		it('gives peter\'s roles in gamaSalesLondonNewYork', function* () {
			const actual = yield AccessTree.rolesFor(nodes.gamaSalesLondonNewYork.id, Users.peter);
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
			expect(actual).to.have.members(['accountant', 'assistant']);
		});
		it('gives peters roles for non-existing reference', function* () {
			const actual = yield AccessTree.rolesFor(7357, Users.peter);
			expect(actual).to.be.an('array').with.length(0);
		});
	});

	describe('#mergedGrants', function () {
		it('gives all users\' roles in gamaSalesLondonNewYork', function* () {
			const actual = yield AccessTree.mergedGrants(nodes.gamaSalesLondonNewYork.id);
			const expected = new Map();

			expected.set(Users.peter, ['manager']);
			expected.set(Users.george, ['manager']);
			expected.set(Users.malory, ['assistant']);
			expected.set(Users.eve, ['accountant', 'assistant']);

			expect(actual).to.deep.equal(expected);
		});

		it('handles fake folders by returning empty map', function* () {
			const actual = yield AccessTree.mergedGrants(7357);
			const expected = new Map();
			expect(actual).to.deep.equal(expected);
		});
	});

	describe('rootId', function () {
		it('is pointing to the tree root in all nodes when they are created', function* () {
			let values = yield AccessTree.findAll({
				where: {
					parentId: null
				},
				include: [
					{
						model: AccessTree,
						as: 'descendents'
					}
				]
			});

			expect(values).to.be.an('array').with.length(3);
			values.forEach(function (root) {
				expect(root.rootId).to.equal(root.id);
				expect(root.descendents).to.be.an('array');
				root.descendents.forEach(function (descendant) {
					expect(descendant.rootId).to.equal(root.id);
				});
			});
		});
	});

	describe('#userRoots returns folders and \"files\" that are roots for the passed user', function () {
		it('for george', function* () {
			const actual = yield AccessTree.userRoots(Users.george);
			expect(actual).to.be.an('array').with.length(2);
			expect(_.map(actual, 'id')).to.have.members([nodes.beta.id, nodes.gama.id]);
		});

		it('for peter', function* () {
			const actual = yield AccessTree.userRoots(Users.peter);
			expect(actual).to.be.an('array').with.length(4);
			expect(_.map(actual, 'id')).to.have
				.members([nodes.alpha.id, nodes.betaSalesAmericas.id, nodes.gamaSales.id, nodes.gamaCarAuction.id]);
		});

		it('for peter as manager', function* () {
			const actual = yield AccessTree.userRoots(Users.peter, ['manager']);
			expect(actual).to.be.an('array').with.length(2);
			expect(_.map(actual, 'id')).to.have
				.members([nodes.alpha.id, nodes.gamaSales.id]);
		});

		it('for peter as manager and/or admin', function* () {
			const actual = yield AccessTree.userRoots(Users.peter, ['manager', 'admin']);
			expect(actual).to.be.an('array').with.length(3);
			expect(_.map(actual, 'id')).to.have
				.members([nodes.alpha.id, nodes.betaSalesAmericas.id, nodes.gamaSales.id]);
		});

		it('for ivan', function* () {
			const actual = yield AccessTree.userRoots(Users.ivan);
			expect(actual).to.be.an('array').with.length(2);
			expect(_.map(actual, 'id')).to.have.members([nodes.betaSales.id, nodes.gamaProcurement.id]);
		});

		it('for eve', function* () {
			const actual = yield AccessTree.userRoots(Users.eve);
			expect(actual).to.be.an('array').with.length(2);
			expect(_.map(actual, 'id')).to.have.members([nodes.betaSalesAmericas.id, nodes.gama.id]);
		});

		it('for malory', function* () {
			const actual = yield AccessTree.userRoots(Users.malory);
			expect(actual).to.be.an('array').with.length(2);
			expect(_.map(actual, 'id')).to.have.members([nodes.beta.id, nodes.gama.id]);
		});

	});

	describe('#userRootPath returns array of ids - path from user root to this reference', function () {

		it('for george', function* () {
			const actual = yield AccessTree.userRootPath(Users.george, nodes.gamaSalesLondonNewYork.id);
			expect(actual).to.be.an('array').with.length(3);
			expect(actual).to.deep.equal([nodes.gama.id, nodes.gamaSales.id, nodes.gamaSalesAmericas.id]);
		});

		it('for peter', function* () {
			const actual = yield AccessTree.userRootPath(Users.peter, nodes.gamaSalesLondonNewYork.id);
			expect(actual).to.be.an('array').with.length(2);
			expect(actual).to.deep.equal([nodes.gamaSales.id, nodes.gamaSalesAmericas.id]);
		});

		it('for eve as any', function* () {
			const actual = yield AccessTree.userRootPath(Users.eve, nodes.gamaSalesLondonNewYork.id);
			expect(actual).to.be.an('array').with.length(3);
			expect(actual).to.deep.equal([nodes.gama.id, nodes.gamaSales.id, nodes.gamaSalesAmericas.id]);
		});

		it('for eve as assistant', function* () {
			const actual = yield AccessTree.userRootPath(Users.eve, nodes.gamaSalesLondonNewYork.id, ['assistant']);
			expect(actual).to.be.an('array').with.length(0);
			expect(actual).to.deep.equal([]);
		});
	});

	describe('#addGrant', function () {
		it('gives ivan\'s roles in gamaSalesLondonNewYork', function* () {
			const ROLE = 'SpeciaL';
			let result = yield AccessTree.addGrant(nodes.gamaSalesLondonNewYork.id, Users.ivan, ROLE);
			const actual = yield AccessTree.rolesFor(nodes.gamaSalesLondonNewYork.id, Users.ivan);
			expect(result).to.be.true;
			expect(actual).to.have.members([ROLE]);
		});
	});

	describe('#revokeGrant', function () {
		const ROLE = 'SpeciaL';
		beforeEach(function* () {
			yield AccessTree.addGrant(nodes.gamaSalesLondonNewYork.id, Users.ivan, ROLE);
		});

		it('revokes ivan\'s roles in gamaSalesLondonNewYork', function* () {
			let result = yield AccessTree.revokeGrant(nodes.gamaSalesLondonNewYork.id, Users.ivan, ROLE);
			const actual = yield AccessTree.rolesFor(nodes.gamaSalesLondonNewYork.id, Users.ivan);
			expect(result).to.be.true;
			expect(actual).to.be.an('array').with.length(0);
		});

		it('revokes ivan\'s roles in gamaSalesLondonNewYork', function* () {
			let result = yield AccessTree.revokeGrant(nodes.gamaSalesLondonNewYork.id, Users.eve, ROLE);
			const actual = yield AccessTree.rolesFor(nodes.gamaSalesLondonNewYork.id, Users.eve);
			expect(result).to.be.false;
			expect(actual).to.have.members(['accountant', 'assistant']);
		});
	});
});
