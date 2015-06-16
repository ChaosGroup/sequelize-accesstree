'use strict';

module.exports = function (sequelize, getRefModel, Grant) {
	const classMethods = {};

	/**
	 * Load a subtree starting with the given refId
	 *
	 * @param refId
	 * @returns {*}
	 */
	classMethods.getSubtree = function* (refId) {
		return yield getRefModel().scope('fullChildTree').findById(refId);
	};

	/**
	 * List all nodes with grants for the given userId
	 *
	 * @param userId
	 * @returns {*}
	 */
	classMethods.withGrantsFor = function* (userId) {
		return yield getRefModel().findAll({
			include: [
				{
					model: Grant,
					as: Grant.options.name.plural,
					where: {
						UserId: userId
					}
				}
			]
		});
	};

	/**
	 * Returns an array of reference nodes that belong to the subtree starting from the refId node.
	 * The root node is included
	 *
	 * @param refId
	 * @returns {Array.<*>}
	 */
	classMethods.nodesInSubtreeFrom = function* (refId) {
		let rootAndDescendents = yield getRefModel().find({
			where: {
				id: refId
			},
			include: {
				model: getRefModel(),
				as: 'descendents'
			}
		});
		let descendents = rootAndDescendents.descendents;
		delete rootAndDescendents.descendents;
		return [rootAndDescendents].concat(descendents);
	};

	/**
	 * Calculates the nodes that must be presented as direct children of the given userId.
	 *
	 * For example in the structure
	 * A
	 * - B
	 * - - C
	 * - - D
	 * - - - E
	 * - - - F
	 * - - G
	 * - - - H
	 * - I
	 * - - J
	 * K
	 * - L
	 * - - M
	 * - - N
	 *
	 * user1 has rights on: A, K => result is [A.id, K.id]
	 * user2 has rights on: D, I => [D.id, I.id]
	 * user3 has rights on: D, G, H, K=> [D.id, G.id, K.id] //J is available under I
	 *
	 * @param userId
	 * @returns {Array.<number>} children node IDs
	 */
	classMethods.getChildrenForUserNode = function* (userId) {
		let roots = yield getRefModel().findAll({
			include: [
				{
					model: Grant,
					as: Grant.options.name.plural,
					where: {
						UserId: userId
					}
				},
				{
					model: getRefModel(),
					as: 'ancestors'
				}
			]
		});
		let ids = _.map(roots, 'id');
		return _.map(_.filter(roots, function (root) {
			return _.intersection(_.map(root.ancestors, 'id'), ids).length === 0;
		}), 'id');
	};


	classMethods.userRootFolder = function* (userId) {
		const notChildrenIds = yield this.getChildrenForUserNode(userId);

		return yield getRefModel().findAll({
			where: {
				id: {$in: notChildrenIds}
			},
			include: [
				{
					model: getRefModel(),
					as: 'descendents',
					hierarchy: true,
					include: [
						{
							model: Grant,
							as: Grant.options.name.plural
						}
					]
				},
				{
					model: Grant,
					as: Grant.options.name.plural,
					where: {
						UserId: userId
					}
				}
			]
		});
	};

	classMethods.mergedGrants = function* (refId) {
		const result = new Map();

		function addGrant(ref) {
			//for each grant of this ref
			ref[Grant.options.name.plural].forEach(function (grant) {
				let roles = result.get(grant.UserId);

				//add userId in map if not present
				if (roles == null) {
					roles = [];
					result.set(grant.UserId, roles);
				}

				//add role to user if not present
				if (roles.indexOf(grant.role) === -1) {
					roles.push(grant.role);
				}
			});
		}

		let root = yield getRefModel().find({
			where: {
				id: refId
			},
			include: [
				{
					model: Grant,
					as: Grant.options.name.plural
				},
				{
					model: getRefModel(),
					as: 'ancestors',
					include: [
						{
							model: Grant,
							as: Grant.options.name.plural
						}
					]
				}
			]
			//, order: [ [ { model: Reference, as: 'ancestors' }, 'hierarchyLevel' ] ]
		});

		addGrant(root);
		root.ancestors.forEach(function (ref) {
			addGrant(ref);
		});

		return result;
	};


	classMethods.rolesFor = function* (refId, userId) {
		let root = yield getRefModel().find({
			where: {
				id: refId
			},
			include: [
				{
					model: sequelize.models.Grant,
					as: Grant.options.name.plural,
					where: {
						UserId: userId
					},
					required: false
				},
				{
					model: getRefModel(),
					as: 'ancestors',
					include: [
						{
							model: Grant,
							as: Grant.options.name.plural,
							where: {
								UserId: userId
							},
							required: false
						}
					]
				}
			]
		});

		return _(root.ancestors).map('Grants').flatten().concat(root.Grants).map('role').uniq().value();
	};

	classMethods.childFolders = function* (parentId) {
		const AccessTree = getRefModel();
		const name = AccessTree.options.name.singular;

		return yield getRefModel().findAll({
			where: {
				parentId
			},
			include: [
				{
					model: AccessTree,
					as: 'children',
					where: {
						type: 'folder'
					},
					attributes: []
				}
			],
			attributes: Object.keys(AccessTree.rawAttributes).concat([
				[
					sequelize.fn('COUNT', 'children.id'),
					`subfolderCount`
				]
			]),
			group: [`${name}.id`]
		});
	};

	return classMethods;
};
