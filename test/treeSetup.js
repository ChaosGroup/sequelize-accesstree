'use strict';
const Users = require('./Users');

module.exports = function* (AccessTree, AccessTreeGrant) {
	const nodes = {};

	nodes.alpha = yield AccessTree.create({
		name: 'Alpha',
		type: 'folder',
		AccessTreeGrants: [{
			UserId: Users.peter,
			role: 'CEO'
		}]
	}, {
		include: {
			model: AccessTreeGrant
		}
	});

	return nodes;
};
