let mongodb = require('mongodb');

let MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost/testdb';

let connection = null;

module.exports = async function getConnection() {
	if (connection) {
		return connection;
	}

	connection = await mongodb.MongoClient.connect(module.exports.MONGO_URL);

	return connection;
};

module.exports.MONGO_URL = MONGO_URL;
