'use strict';
const Users = require('./Users');

module.exports = function* (AccessTree, AccessTreeGrant) {
	const nodes = {};

	nodes.alpha = yield AccessTree.create({
		name: 'Alpha',
		type: 'folder',
		AccessTreeGrants: [{
			UserId: Users.peter,
			role: 'manager'
		}]
	}, {
		include: {
			model: AccessTreeGrant
		}
	});

	nodes.beta = yield AccessTree.create({
		name: 'Beta',
		type: 'folder',
		AccessTreeGrants: [{
			UserId: Users.george,
			role: 'manager'
		}, {
			UserId: Users.malory,
			role: 'assistant'
		}]
	}, {
		include: {
			model: AccessTreeGrant
		}
	});

	nodes.betaSales = yield AccessTree.create({
		name: 'Sales',
		type: 'folder',
		parentId: nodes.beta.id,
		AccessTreeGrants: [{
			UserId: Users.ivan,
			role: 'manager'
		}]
	}, {
		include: {
			model: AccessTreeGrant
		}
	});

	nodes.betaSalesAmericas = yield AccessTree.create({
		name: 'Sales',
		type: 'folder',
		parentId: nodes.betaSales.id,
		AccessTreeGrants: [{
			UserId: Users.eve,
			role: 'seller'
		}, {
			UserId: Users.peter,
			role: 'admin'
		}]
	}, {
		include: {
			model: AccessTreeGrant
		}
	});

	nodes.gama = yield AccessTree.create({
		name: 'Gama',
		type: 'folder',
		AccessTreeGrants: [{
			UserId: Users.george,
			role: 'manager'
		}, {
			UserId: Users.malory,
			role: 'assistant'
		}, {
			UserId: Users.eve,
			role: 'accountant'
		}]
	}, {
		include: {
			model: AccessTreeGrant
		}
	});

	nodes.gamaProcurement = yield AccessTree.create({
		name: 'Procurement',
		type: 'folder',
		parentId: nodes.gama.id,
		AccessTreeGrants: [{
			UserId: Users.ivan,
			role: 'manager'
		}]
	}, {
		include: {
			model: AccessTreeGrant
		}
	});

	nodes.gamaSales = yield AccessTree.create({
		name: 'Sales',
		type: 'folder',
		parentId: nodes.gama.id,
		AccessTreeGrants: [{
			UserId: Users.peter,
			role: 'manager'
		}]
	}, {
		include: {
			model: AccessTreeGrant
		}
	});

	nodes.gamaSalesAmericas = yield AccessTree.create({
		name: 'Americas Sales',
		type: 'folder',
		parentId: nodes.gamaSales.id
	});
	nodes.gamaSalesAsia = yield AccessTree.create({
		name: 'Asia Sales',
		type: 'folder',
		parentId: nodes.gamaSales.id
	});

	nodes.gamaCarAuction = yield AccessTree.create({
		name: 'car',
		type: 'auction:buyer',
		parentId: nodes.gama.id
	});

	nodes.gamaOfficeAuction = yield AccessTree.create({
		name: 'oldOffice',
		type: 'auction:seller',
		parentId: nodes.gama.id
	});

	nodes.gamaSalesLondonParis = yield AccessTree.create({
		name: 'london-paris',
		type: 'auction:seller',
		parentId: nodes.gamaSales.id
	});

	nodes.gamaSalesLondonCopenhagen = yield AccessTree.create({
		name: 'london-copenhagen',
		type: 'auction:seller',
		parentId: nodes.gamaSales.id
	});

	nodes.gamaSalesLondonNewYork = yield AccessTree.create({
		name: 'london-newyork',
		type: 'auction:seller',
		parentId: nodes.gamaSalesAmericas.id,
		AccessTreeGrants: [{
			UserId: Users.eve,
			role: 'assistant'
		}]
	}, {
		include: {
			model: AccessTreeGrant
		}
	});

	return nodes;
};
