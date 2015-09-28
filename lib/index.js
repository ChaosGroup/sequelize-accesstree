'use strict';

const _ = require('lodash');
const co = require('co');
const scopes = require('./scopes');
const classMethods = require('./classMethods');

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
				//prepare objects
				options.scopes = options.scopes || {};
				options.classMethods = options.classMethods || {};
				options.getterMethods = options.getterMethods || {};
				options.hooks = options.hooks || {};

				//add reference type
				def[_.get(settings, 'typeName', 'type')] = {
					type: DataTypes.STRING
				};

				//attach root Id and handle creates and updates
				def.rootId = {
					type: DataTypes.INTEGER
				};
				const setRootId = function* (attributes) {
					if (attributes.parentId == null) {
						//this is a root node
						if (attributes.id != null) {
							attributes.rootId = attributes.id;
						}
						return;
					}
					const parent = yield getRefModel().findById(attributes.parentId);
					attributes.rootId = parent.rootId || parent.id;
				};
				addHook(options.hooks, 'beforeCreate', setRootId);
				addHook(options.hooks, 'afterCreate', function* (instance) {
					if (instance.parentId == null) {
						console.log('AFTER CREATE HOOK FOR REFERENCE', instance.id);
						instance.rootId = instance.id;
						console.log('DURING AFTER CREATE HOOK FOR REFERENCE', instance);
						yield instance.save();
						console.log('AFTER AFTER CREATE HOOK FOR REFERENCE', instance);
					}
				});
				addHook(options.hooks, 'beforeUpdate', setRootId);

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

				addAssociations(options, function (models) {
					models[NAME].hasMany(Grant);
					Grant.belongsTo(models[NAME]);
				});

				//add the scopes
				_.assign(options.scopes, scopes(sequelize, getRefModel, Grant));

				//add the methods for work with hierarchy
				_.assign(options.classMethods, classMethods(sequelize, getRefModel, Grant));

				options.getterMethods.subfolderCount = function () {
					let result = this.getDataValue('subfolderCount');
					return result == null? null: parseInt(result, 10);
				};
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

function addHook(hooks, name, gfn) {
	hooks[name] = hooks[name] || [];
	hooks[name].push(function (value, params, callback) {
		co.wrap(gfn)(value, params).then(function () {
			callback();
		}, callback);
	});
}
