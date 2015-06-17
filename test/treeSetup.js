'use strict';
const Users = require('./Users');

module.exports = function* (AccessTree, AccessTreeGrant) {
	const nodes = {};
	const WITH_GRANT = {
		include: {
			model: AccessTreeGrant
		}
	};


	nodes.alpha = yield AccessTree.create({
		name: 'Alpha',
		type: 'folder',
		AccessTreeGrants: [
			{
				UserId: Users.peter,
				role: 'manager'
			}
		]
	}, WITH_GRANT);

	nodes.beta = yield AccessTree.create({
		name: 'Beta',
		type: 'folder',
		AccessTreeGrants: [
			{
				UserId: Users.george,
				role: 'manager'
			}, {
				UserId: Users.malory,
				role: 'assistant'
			}
		]
	}, WITH_GRANT);

	nodes.betaSales = yield AccessTree.create({
		name: 'Sales',
		type: 'folder',
		parentId: nodes.beta.id,
		AccessTreeGrants: [
			{
				UserId: Users.ivan,
				role: 'manager'
			}
		]
	}, WITH_GRANT);

	nodes.betaSalesAmericas = yield AccessTree.create({
		name: 'Sales',
		type: 'folder',
		parentId: nodes.betaSales.id,
		AccessTreeGrants: [
			{
				UserId: Users.eve,
				role: 'seller'
			}, {
				UserId: Users.peter,
				role: 'admin'
			}
		]
	}, WITH_GRANT);

	nodes.gama = yield AccessTree.create({
		name: 'Gama',
		type: 'folder',
		AccessTreeGrants: [
			{
				UserId: Users.george,
				role: 'manager'
			}, {
				UserId: Users.malory,
				role: 'assistant'
			}, {
				UserId: Users.eve,
				role: 'accountant'
			}
		]
	}, WITH_GRANT);

	nodes.gamaProcurement = yield AccessTree.create({
		name: 'Procurement',
		type: 'folder',
		parentId: nodes.gama.id,
		AccessTreeGrants: [
			{
				UserId: Users.ivan,
				role: 'manager'
			}
		]
	}, WITH_GRANT);

	nodes.gamaSales = yield AccessTree.create({
		name: 'Sales',
		type: 'folder',
		parentId: nodes.gama.id,
		AccessTreeGrants: [
			{
				UserId: Users.peter,
				role: 'manager'
			}
		]
	}, WITH_GRANT);

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
		parentId: nodes.gama.id,
		AccessTreeGrants: [
			{
				UserId: Users.peter,
				role: 'consultant'
			}
		]
	}, WITH_GRANT);

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
		AccessTreeGrants: [
			{
				UserId: Users.eve,
				role: 'assistant'
			}
		]
	}, WITH_GRANT);

	return nodes;
};
