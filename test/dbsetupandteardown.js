/**
 * This file exposes a method to be invoked inside a describe. It adds setup and tear down hooks for creating and
 * cleaning the database
 */
'use strict';

const Promise = require('bluebird');
const pg = require('pg');
const config = require('./config');
const db = require('./dbinit');

const connectionString = ['postgres://', config.username, ':', config.password, '@', config.host, '/'].join('');
const baseDbName = 'postgres';
const testDbName = db.sequelize.getQueryInterface().quoteIdentifier(config.database);

function getPgConnection() {
	return new Promise(function (resolve, reject) {
		pg.connect(connectionString + baseDbName, function (err, client) {
			if (err) {
				reject(err);
			}
			else {
				resolve(client);
			}
		});
	});
}

function* query(queryString) {
	const connection = yield getPgConnection();
	const queryFn = Promise.promisify(connection.query.bind(connection));
	return yield queryFn(queryString);
}

function defaultConnectionSetup() {
	let shouldDropDatabase = false;
	before(function* () {
		try {
			yield query('CREATE DATABASE ' + testDbName);
			shouldDropDatabase = true;
		}
		catch (err) {
			// if the database already exists then fail silently
		}
		yield db.sequelize.sync({ force: true });
	});

	afterEach(function* () {
		yield db.sequelize.sync({ force: true });
	});

	after(function* () {
		db.sequelize.close();
		if(shouldDropDatabase) {
			console.log('DROPING THE DATABASE WE CREATED FOR THE TEST');
			yield query('DROP DATABASE ' + testDbName);
		}
	});
}

module.exports = defaultConnectionSetup;
