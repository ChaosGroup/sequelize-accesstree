'use strict';

const _ = require('lodash');

module.exports = function (Sequelize) {
	if (!Sequelize) {
		Sequelize = require('sequelize');
	}
	if (Sequelize.SequelizeHierarchyError == null) {
		console.log('SEQUELIZE ACCESS TREE: adding sequelize-hierarchy. ' +
			'DO NOT ADD SEQUELIZE HIERARCHY AFTER THIS POINT');
		const hierarchy = require('sequelize-hierarchy');
		hierarchy(Sequelize);
	} else {
		console.log('SEQUELIZE ACCESS TREE: SEQUELIZE HIERARCHY found, using it');
	}

	//alias for data types
	const DataTypes = Sequelize;
	Sequelize.addHook('afterInit', function (sequelize) {
		sequelize.addHook('beforeDefine', function (def, options) {
			const NAME = options.name.singular;
			/**
			 * returns the AccessTree model to work with
			 */
			function getRefModel() {
				return sequelize.models[NAME];
			}

			if (options.fsreference) {
				let settings = options.fsreference;
				const GRANT_NAME = _.get(settings, 'grantName', NAME + 'Grant');

				//make it hierarchy
				options.hierarchy = true;
				//add reference type
				def[_.get(settings, 'typeName', 'type')] = {
					type: DataTypes.ENUM('folder', 'buyer', 'seller')
				};

				//create and attach 'Grant'
				const Grant = sequelize.define(GRANT_NAME, {
					role: {
						type: DataTypes.STRING,
						allowNull: false,
						index: true
					},
					UserId: {
						type: DataTypes.INTEGER(),
						allowNull: false,
						index: true
					}
				});
				const GRANT_NAME_PLURAL = Grant.options.name.plural;

				addAssociations(options, function (models) {
					models[NAME].hasMany(Grant);
					Grant.belongsTo(models[NAME]);
				});

				//add the scopes
				options.scopes = options.scopes || {};
				options.scopes.withgrants = function () {
					return {
						include: [
							{
								model: Grant,
								as: GRANT_NAME_PLURAL
							}
						]
					};
				};

				//add the methods for work with hierarchy
				options.classMethods = options.classMethods || {};
				/**
				 * Load a subtree starting with the given refId
				 *
				 * @param refId
				 * @returns {*}
				 */
				options.classMethods.getSubtree = function* (refId) {
					return yield getRefModel().find({
						where: {id: refId},
						include: [
							{
								model: getRefModel(),
								as: 'descendents',
								hierarchy: true,
								include: [
									{
										model: sequelize.models.Grant,
										as: GRANT_NAME_PLURAL
									}
								]
							},
							{
								model: sequelize.models.Grant,
								as: GRANT_NAME_PLURAL
							}
						]
					});
				};

				/**
				 * List all nodes with grants for the given userId
				 *
				 * @param userId
				 * @returns {*}
				 */
				options.classMethods.withGrantsFor = function* (userId) {
					return yield getRefModel().findAll({
						include: [
							{
								model: Grant,
								as: GRANT_NAME_PLURAL,
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
				options.classMethods.nodesInSubtreeFrom = function* (refId) {
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
				options.classMethods.getChildrenForUserNode = function* (userId) {
					let roots = yield getRefModel().findAll({
						include: [
							{
								model: Grant,
								as: GRANT_NAME_PLURAL,
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


				options.classMethods.userRootFolder = function* (userId) {
					const notChildrenIds = yield this.getChildrenForUserNode(userId);

					return yield getRefModel().findAll({
						where: {
							id : { $in: notChildrenIds }
						},
						include: [
							{
								model: getRefModel(),
								as: 'descendents',
								hierarchy: true,
								include: [
									{
										model: Grant,
										as: GRANT_NAME_PLURAL
									}
								]
							},
							{
								model: Grant,
								as: GRANT_NAME_PLURAL,
								where: {
									UserId: userId
								}
							}
						]
					});
				};

				options.classMethods.mergedGrants = function* (refId) {
					const result = new Map();

					function addGrant(ref) {
						//for each grant of this ref
						ref[GRANT_NAME_PLURAL].forEach(function (grant) {
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
								as: GRANT_NAME_PLURAL
							},
							{
								model: getRefModel(),
								as: 'ancestors',
								include: [{
									model: Grant,
									as: GRANT_NAME_PLURAL
								}]
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

				options.classMethods.rolesFor = function* (refId, userId) {
					let root = yield getRefModel().find({
						where: {
							id: refId
						},
						include: [
							{
								model: sequelize.models.Grant,
								as: GRANT_NAME_PLURAL,
								where: {
									UserId: userId
								},
								required: false
							},
							{
								model: getRefModel(),
								as: 'ancestors',
								include: [{
									model: Grant,
									as: GRANT_NAME_PLURAL,
									where: {
										UserId: userId
									},
									required: false
								}]
							}
						]
					});

					return _(root.ancestors).map('Grants').flatten().concat(root.Grants).map('role').uniq().value();
				}
			}
		});
	});

};

function addAssociations(options, addition) {
	let original = _.get(options, `classMethods.associate`, function () {
	});
	_.set(options, `classMethods.associate`, function () {
		let res = original.apply(this, arguments);
		addition.apply(this, arguments);
		return res;
	});
}
