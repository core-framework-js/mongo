let getConnection = require('./mongoConnection');
let MongoPool = require('../src/MongoPool');

let assert = require('chai').assert;

let poolOptions = {
	min: 0,
	max: 2,
	acquireTimeoutMillis: 1000
};

function createPool() {
	return new MongoPool(getConnection.MONGO_URL, poolOptions);
}

describe('MongoPool', () => {
	it('exists', () => {
		assert.isFunction(MongoPool);
	});

	it('works', async () => {
		let pool = createPool();

		let db = await pool.acquire();

		assert.isObject(db);
		assert.equal(pool.pool.borrowed, 1);

		let stats = await db.stats();

		assert.isObject(stats);

		pool.release(db);
		assert.equal(pool.pool.borrowed, 0);

		await pool.shutdown();
	});
});

