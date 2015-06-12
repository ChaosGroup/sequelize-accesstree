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

	return nodes;
};
