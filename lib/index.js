'use strict';

const _ = require('lodash');
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
				//add reference type
				def[_.get(settings, 'typeName', 'type')] = {
					type: DataTypes.STRING
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

				addAssociations(options, function (models) {
					models[NAME].hasMany(Grant);
					Grant.belongsTo(models[NAME]);
				});

				//add the scopes
				options.scopes = options.scopes || {};
				_.assign(options.scopes, scopes(sequelize, getRefModel, Grant));

				//add the methods for work with hierarchy
				options.classMethods = options.classMethods || {};
				_.assign(options.classMethods, classMethods(sequelize, getRefModel, Grant));

				options.getterMethods = options.getterMethods || {};
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
