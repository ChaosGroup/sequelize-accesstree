'use strict';

module.exports = function (sequelize, getRefModel, Grant) {
	const scopes = {};

	scopes.withgrants = function () {
		return {
			include: [
				{
					model: Grant,
					as: Grant.options.name.plural
				}
			]
		};
	};

	/**
	 * Returns full subtree with grants populated
	 *
	 * @returns {*}
	 */
	scopes.fullChildTree = function () {
		return {
			include: [
				{
					model: Grant,
					as: Grant.options.name.plural
				}, {
					model: getRefModel(),
					as: 'descendents',
					hierarchy: true,
					include: [
						{
							model: Grant,
							as: Grant.options.name.plural
						}
					]
				}
			]
		};
	};

	/**
	 * Returns full subtree with grants populated
	 *
	 * @returns {*}
	 */
	scopes.fullChildren = function () {
		return {
			include: [
				{
					model: Grant,
					as: Grant.options.name.plural
				}, {
					model: getRefModel(),
					as: 'children',
					include: [
						{
							model: Grant,
							as: Grant.options.name.plural
						}
					]
				}
			]
		};
	};


	return scopes;
};
