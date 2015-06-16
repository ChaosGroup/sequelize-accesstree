'use strict';

module.exports = function (getRefModel, Grant, GRANT_NAME_PLURAL) {
	const scopes = {};

	scopes.withgrants = function () {
		return {
			include: [
				{
					model: Grant,
					as: GRANT_NAME_PLURAL
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
					as: GRANT_NAME_PLURAL
				}, {
					model: getRefModel(),
					as: 'descendents',
					hierarchy: true,
					include: [
						{
							model: Grant,
							as: GRANT_NAME_PLURAL
						}
					]
				}
			]
		}
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
					as: GRANT_NAME_PLURAL
				}, {
					model: getRefModel(),
					as: 'children',
					include: [
						{
							model: Grant,
							as: GRANT_NAME_PLURAL
						}
					]
				}
			]
		}
	};

	return scopes;
};
