'use strict';
const _ = require('lodash');

/**
 * A drive represents external to this library object that "holds" an access tree by referring to its root
 *
 * @typedef {Object} Drive
 * @property {Array.<AccessTree>} children
 * @property {string} name
 * @property {string} type
 */

/**
 * An object containing information to be used in an authorization decision
 *
 * @typedef {Object} AuthzDetails
 * @property {Array.<string>} roles
 * @property {string} type
 */


module.exports = function (sequelize, getRefModel, Grant) {

	/**
	 * @constructor
	 */
	function AccessTree() {}

	//const AccessTree.prototype = AccessTree.prototype;

	/**
	 * List all nodes with grants for the given userId
	 *
	 * @param {number} userId
	 * @returns {Array.<AccessTreeWithGrants>}
	 */
	AccessTree.prototype.withGrantsFor = function* (userId) {
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
	 * Calculates the nodes that must be presented as direct children of the given userId.
	 *
	 * For example in the structure
	 * <pre>
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
	 * </pre>
	 * <li>user1 has rights on: A, K => result is [A.id, K.id]
	 * <li>user2 has rights on: D, I => [D.id, I.id]
	 * <li>user3 has rights on: D, G, H, K=> [D.id, G.id, K.id] //J is available under I
	 *
	 * @param userId
	 * @param {Array.<string>} [inRoles] only grants for any of those roles are considered a match
	 * @returns {Array.<number>} children node IDs
	 */
	AccessTree.prototype.getChildrenForUserNode = function* (userId, inRoles) {
		const grantWhere = {
			UserId: userId
		};
		if (inRoles != null && Array.isArray(inRoles)) {
			grantWhere.role = {$in: inRoles};
		}
		let roots = yield getRefModel().findAll({
			include: [
				{
					model: Grant,
					as: Grant.options.name.plural,
					where: grantWhere
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

	/**
	 * Merges all role sets granted per user from the root to the given folder.
	 *
	 *
	 * @param {number} refId
	 * @returns {Map.<Number, Array.<string>>} The values should be considered sets in the sense that the values in them
	 *     are not repeated
	 */
	AccessTree.prototype.mergedGrants = function* (refId) {
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

		if (root !== null) {
			addGrant(root);
			root.ancestors.forEach(function (ref) {
				addGrant(ref);
			});
		}

		return result;
	};

	/**
	 * Load array of roles that the given user has granted (directly or inherited) on the given AccessTree node
	 *
	 * @param {number} refId
	 * @param {number} userId
	 * @returns {Array.<string>} array of roles
	 */
	AccessTree.prototype.rolesFor = function* (refId, userId) {
		return (yield this.authzDetailsFor(refId, userId, [])).roles;
	};

	/**
	 * Returns user rights related object containing the roles and type and other fields described in the 3-rd parameter
	 *
	 * @param {number} refId
	 * @param {number} userId
	 * @param {Array.<string>} [additionalFields]
	 * @returns {AuthzDetails}
	 */
	AccessTree.prototype.authzDetailsFor = function* (refId, userId, additionalFields) {
		additionalFields = additionalFields || [];

		let root = yield getRefModel().find({
			where: {
				id: refId
			},
			include: [
				{
					model: Grant,
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
		if (root === null) {
			return {
				roles: []
			};
		}

		const aggrRoles = _(root.ancestors).map(Grant.options.name.plural).flatten()
			.concat(root[Grant.options.name.plural])
			.compact().map('role').uniq().value();

		const result = {
			roles: aggrRoles,
			type: root.type
		};

		for (let prop of additionalFields) {
			result[prop] = root[prop];
		}

		return result;
	};

	/**
	 * Returns all nodes that the user has access to and are not nested in other nodes.
	 *
	 * The nodes have grants and subfolderCount populated
	 *
	 * @param {number} userId
	 * @param {Array.<string>} [inRoles] the roles needed for a node to be considered a match
	 * @returns {Array.<Drive>}
	 */
	AccessTree.prototype.userRoots = function* (userId, inRoles) {
		const AccessTree = getRefModel();
		const name = AccessTree.options.name.singular;

		const ids = yield this.getChildrenForUserNode(userId, inRoles);

		return yield getRefModel().scope('withgrants').findAll({
			where: {
				id: {$in: ids}
			},
			include: [
				{
					model: AccessTree,
					as: 'children',
					where: {
						type: 'folder'
					},
					required: false,
					attributes: []
				}
			],
			attributes: Object.keys(AccessTree.rawAttributes).concat([
				[
					//using the sequelize.col is needed to skip counting null values
					sequelize.fn('COUNT', sequelize.col('children.id')),
					`subfolderCount`
				]
			]),
			group: [`${name}.id`, sequelize.col(`${Grant.options.name.plural}.id`)]
		});
	};

	/**
	 * This class loads all direct subfolders of the given folderId and sets their childFolderCount
	 *
	 * @param {number} parentId the parent folder Id
	 * @returns {Array.<AccessTreeWithChildFolderCount>}
	 */
	AccessTree.prototype.childFolders = function* (parentId) {
		const AccessTree = getRefModel();
		const name = AccessTree.options.name.singular;

		return yield getRefModel().findAll({
			where: {
				parentId,
				//limit children to folders only
				type: 'folder'
			},
			include: [
				{
					model: AccessTree,
					as: 'children',
					where: {
						type: 'folder'
					},
					required: false,
					attributes: []
				}
			],
			attributes: Object.keys(AccessTree.rawAttributes).concat([
				[
					//using the sequelize.col is needed to skip counting null values
					sequelize.fn('COUNT', sequelize.col('children.id')),
					`subfolderCount`
				]
			]),
			group: [`${name}.id`]
		});
	};

	/**
	 * Adds a grant into the given AccessTree node for the given user with the given role
	 *
	 * @param {number} accessTreeId
	 * @param {number} UserId
	 * @param {string} role
	 * @returns {boolean} is the grant successful. If the grant is already present false will be returned
	 */
	AccessTree.prototype.addGrant = function* (accessTreeId, UserId, role) {
		const grantData = {
			UserId,
			role
		};
		grantData[`${getRefModel().options.name.singular}Id`] = accessTreeId;

		let matchingGrants = yield Grant.findAll({
			where: grantData
		});

		if (matchingGrants.length > 0) {
			return false;
		}

		yield Grant.create(grantData);
		return true;
	};

	/**
	 * Revoke a grant from the given AccessTree node for the given user with the given role
	 *
	 * @param {number} accessTreeId
	 * @param {number} UserId
	 * @param {string} role
	 * @returns {boolean} is the revoke successful, if no matching revoke was found false is returned
	 */
	AccessTree.prototype.revokeGrant = function* (accessTreeId, UserId, role) {
		const grantData = {
			UserId,
			role
		};
		grantData[`${getRefModel().options.name.singular}Id`] = accessTreeId;

		let matchingGrants = yield Grant.findAll({
			where: grantData
		});

		if (matchingGrants.length === 0) {
			return false;
		}

		yield matchingGrants[0].destroy();
		return true;
	};


	return AccessTree.prototype;
};
