'use strict';

const Sequelize = require('sequelize');
const path = require('path');

//enable access trees
require('../lib')(Sequelize);

const config = require('./config');
const sequelize = new Sequelize(config.database, config.username, config.password, config);

const co = require('co');

const AccessTree = sequelize.import(path.join(__dirname, 'AccessTree'));

if (typeof AccessTree.associate === 'function') {
	AccessTree.associate({
		sequelize,
		Sequelize,
		AccessTree
	});
}

module.exports = {
	sequelize,
	Sequelize,
	AccessTree
};
