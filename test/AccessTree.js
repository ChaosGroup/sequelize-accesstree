'use strict';

module.exports = function (sequelize, DataTypes) {
	var AccessTree = sequelize.define('AccessTree', {
		name: {
			type: DataTypes.STRING
		}
	}, {
		fsreference: {}
	});

	return AccessTree;
};
