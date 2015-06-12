'use strict';
const Users = require('./Users');

exports.init = function* (AccessTree, AccessTreeGrants) {
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
			model: AccessTreeGrants
		}
	});
};
