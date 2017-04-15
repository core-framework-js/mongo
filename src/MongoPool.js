let mongodb = require('mongodb');
let genericPool = require('generic-pool');
let lodash = require('lodash');

let defaultOptions = {
	min: 2,
	max: 10,
	maxWaitingClients: 15,
	acquireTimeoutMillis: 2000,
	evictionRunIntervalMillis: 30000
};

class MongoPool {

	constructor(mongoUrl, options) {
		let poolOptions = lodash.defaults({}, options, defaultOptions);

		this.pool = genericPool.createPool({
				create: function () {
					return mongodb.MongoClient.connect(mongoUrl);
				},
				destroy: function (db) {
					return new Promise(function (resolve) {
						db.close();
						resolve();
					});
				}
			},
			{ // Pool options.
				min: poolOptions.min,
				max: poolOptions.max,
				maxWaitingClients: poolOptions.maxWaitingClients,
				acquireTimeoutMillis: poolOptions.acquireTimeoutMillis,
				evictionRunIntervalMillis: poolOptions.evictionRunIntervalMillis
			}
		);
	}

	acquire() {
		return this.pool.acquire();
	}

	release(db) {
		this.pool.release(db);
	}

	async shutdown() {
		await this.pool.drain();
		await this.pool.clear();
	}
}

module.exports = MongoPool;
