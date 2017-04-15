let getConnection = require('./mongoConnection');
let MongoPool = require('../src/MongoPool');
let MongoUtils = require('../src/MongoUtils');
let mongodb = require('mongodb');

let assert = require('chai').assert;
let deepEqual = require('deep-equal');
let lodash = require('lodash');

function ownError(err) {
	this.ownErrors.push(err);
}

let poolOptions = {
	min: 0,
	max: 2,
	acquireTimeoutMillis: 1000
};

function createPool() {
	return new MongoPool(getConnection.MONGO_URL, poolOptions);
}

function createUtils() {
	let utils = new MongoUtils(createPool());

	utils.ownErrors = [];
	utils.logError = ownError;

	return utils;
}


let connection;

before(async () => {
	connection = await getConnection();
});

after(async () => {
	await connection.close();
});

describe('MongoUtils', () => {
	let utils;

	before(async () => {
		utils = createUtils();
	});

	it('exists', () => {
		assert.isFunction(MongoUtils);
	});

	describe('constructor', () => {
		it('accepts MongoPool', () => {
			new MongoUtils(createPool());
		});

		it('fails without MongoPool', () => {
			try {
				new MongoUtils(null);
			} catch (e) {
				return;
			}

			throw new Error('Error expected');
		});

		it('fails with invalid object instead of MongoPool', () => {
			try {
				new MongoUtils({});
			} catch (e) {
				return;
			}

			throw new Error('Error expected');
		});
	});

	describe('castId()', () => {
		it('exists', () => {
			assert.property(utils, 'castId');
			assert.isFunction(utils.castId);
		});

		it('works', () => {
			let object = {
				_id: '1234567890AB1234567890AB'
			};

			utils.castId(object);

			assert.isObject(object._id);
			assert.ok(object._id instanceof mongodb.ObjectId);
		});

		it('does nothing for null', () => {
			utils.castId(null);
		});

		it('does nothing if there is already an ObjectId', () => {
			let object = {
				_id: new mongodb.ObjectId('1234567890AB1234567890AB')
			};

			let id = object._id;

			utils.castId(object);

			assert.isObject(object._id);
			assert.ok(object._id === id);
		});
	});

	describe('insertOne()', () => {
		it('exists', () => {
			assert.property(utils, 'insertOne');
			assert.isFunction(utils.insertOne);
		});

		it('inserts documents', async () => {
			let id = await utils.insertOne('test', {
				foo: 'bar'
			});

			assert.isObject(id);
			assert.ok(id instanceof mongodb.ObjectId);
			assert.equal(utils.pool.pool.borrowed, 0);

			let doc = await connection.collection('test').findOne({_id: id});

			assert.isObject(doc);
			assert.isObject(doc._id);
			assert.equal(id.toString(), doc._id.toString());
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.insertOne('test', null);
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});

	describe('insertMany()', () => {
		it('exists', () => {
			assert.property(utils, 'insertMany');
			assert.isFunction(utils.insertMany);
		});

		it('inserts documents', async () => {
			let ids = await utils.insertMany('test', [{
				foo: 'bar'
			}, {
				tar: 'car'
			}]);

			assert.isArray(ids);
			assert.equal(ids.length, 2);
			assert.isObject(ids[0]);
			assert.ok(ids[0] instanceof mongodb.ObjectId);
			assert.isObject(ids[1]);
			assert.ok(ids[1] instanceof mongodb.ObjectId);

			assert.equal(utils.pool.pool.borrowed, 0);

			let docs = await connection.collection('test').find({_id: {$in: ids}}).toArray();

			assert.isArray(docs);
			assert.isObject(docs[0]);
			assert.isObject(docs[0]._id);
			assert.equal(ids[0].toString(), docs[0]._id.toString());
			assert.isObject(docs[1]);
			assert.isObject(docs[1]._id);
			assert.equal(ids[1].toString(), docs[1]._id.toString());
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.insertMany('test');
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});

	describe('updateOne()', () => {
		it('exists', () => {
			assert.property(utils, 'updateOne');
			assert.isFunction(utils.updateOne);
		});

		it('updates documents', async () => {
			let insertResult = await connection.collection('test').insertOne({foo: 'bar'});
			let id = insertResult.insertedId;

			assert.isObject(id);

			let result = await utils.updateOne('test', {_id: id}, {foo: 'car'});

			assert.equal(result, 1);
			assert.equal(utils.pool.pool.borrowed, 0);

			let doc = await connection.collection('test').findOne({_id: id});

			assert.isObject(doc);
			assert.equal(doc.foo, 'car');
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.updateOne('test', null);
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});

	describe('updateMany()', () => {
		it('exists', () => {
			assert.property(utils, 'updateMany');
			assert.isFunction(utils.updateMany);
		});

		it('updates documents', async () => {
			let insertResult = await connection.collection('test').insertMany([
				{foo: 'bar'}, {foo: 'far'}, {foo: 'tar'}
			]);
			let ids = insertResult.insertedIds;

			assert.isArray(ids);
			assert.equal(ids.length, 3);

			let result = await utils.updateMany('test', {_id: { $in: ids }}, { $set: { foo: 'car'}});

			assert.equal(result, 3);
			assert.equal(utils.pool.pool.borrowed, 0);

			let doc = await connection.collection('test').findOne({_id: ids[0]});

			assert.isObject(doc);
			assert.equal(doc.foo, 'car');
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.updateMany('test', null);
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});

	describe('deleteOne()', () => {
		it('exists', () => {
			assert.property(utils, 'deleteOne');
			assert.isFunction(utils.deleteOne);
		});

		it('deletes documents', async () => {
			let insertResult = await connection.collection('test').insertOne({foo: 'bar'});
			let id = insertResult.insertedId;

			assert.isObject(id);

			let result = await utils.deleteOne('test', {_id: id});

			assert.equal(result, 1);
			assert.equal(utils.pool.pool.borrowed, 0);

			let doc = await connection.collection('test').findOne({_id: id});

			assert.isNull(doc);
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.deleteOne(null);
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});


	describe('deleteMany()', () => {
		it('exists', () => {
			assert.property(utils, 'deleteMany');
			assert.isFunction(utils.deleteMany);
		});

		it('deletes documents', async () => {
			let insertResult = await connection.collection('test').insertMany([
				{foo: 'bar'}, {foo: 'car'}, {foo: 'tar'}
			]);
			let ids = insertResult.insertedIds;

			assert.isArray(ids);
			assert.equal(ids.length, 3);

			let toDelete = ids.slice(0, 2);

			assert.equal(toDelete.length, 2);

			let result = await utils.deleteMany('test', {_id: {$in: toDelete}});

			assert.equal(result, 2);
			assert.equal(utils.pool.pool.borrowed, 0);

			let docs = await connection.collection('test').find({_id: {$in: ids}}).toArray();

			assert.isArray(docs);
			assert.equal(docs.length, 1);
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.deleteMany(null);
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});

	describe('count()', () => {
		it('exists', () => {
			assert.property(utils, 'count');
			assert.isFunction(utils.count);
		});

		it('counts documents', async () => {
			let beforeCount = await utils.count('test', {});

			assert.isNumber(beforeCount);

			await connection.collection('test').insertOne({foo: 'bar'});

			let afterCount = await utils.count('test', {});

			assert.equal(beforeCount + 1, afterCount);
			assert.equal(utils.pool.pool.borrowed, 0);
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.count(null);
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});

	describe('find()', () => {
		let ids;

		before(async () => {
			let insertResult = await connection.collection('test').insertMany([{
				foo: 'bar',
				tar: 'bar'
			}, {
				foo: 'car',
				tar: 'car'
			}]);

			ids = insertResult.insertedIds;

			assert.isArray(ids);
			assert.equal(ids.length, 2);
		});

		it('exists', () => {
			assert.property(utils, 'find');
			assert.isFunction(utils.find);
		});

		it('finds documents', async () => {
			let docs = await utils.find('test', {_id: {$in: ids}});

			assert.equal(utils.pool.pool.borrowed, 0);

			assert.isArray(docs);
			assert.equal(docs.length, 2);
			assert.isObject(docs[0]);
			assert.isObject(docs[0]._id);
			assert.equal(ids[0].toString(), docs[0]._id.toString());
			assert.isObject(docs[1]);
			assert.isObject(docs[1]._id);
			assert.equal(ids[1].toString(), docs[1]._id.toString());
		});

		it('can limit search', async () => {
			let docs = await utils.find('test', {_id: {$in: ids}}, {limit: 1});

			assert.equal(utils.pool.pool.borrowed, 0);

			assert.isArray(docs);
			assert.equal(docs.length, 1);
			assert.isObject(docs[0]);
			assert.isObject(docs[0]._id);
			assert.equal(ids[0].toString(), docs[0]._id.toString());
		});

		it('can skip results', async () => {
			let docs = await utils.find('test', {_id: {$in: ids}}, {skip: 1});

			assert.equal(utils.pool.pool.borrowed, 0);

			assert.isArray(docs);
			assert.equal(docs.length, 1);
			assert.isObject(docs[0]);
			assert.isObject(docs[0]._id);
			assert.equal(ids[1].toString(), docs[0]._id.toString());
		});

		it('can limit fields', async () => {
			let docs = await utils.find('test', {_id: {$in: ids}}, {fields: {tar: 1}});

			assert.equal(utils.pool.pool.borrowed, 0);

			assert.isArray(docs);
			assert.equal(docs.length, 2);
			assert.isObject(docs[0]);
			assert.isObject(docs[0]._id);
			assert.notProperty(docs[0], 'foo');
			assert.property(docs[0], 'tar');
			assert.isObject(docs[1]);
			assert.isObject(docs[1]._id);
			assert.notProperty(docs[1], 'foo');
			assert.property(docs[1], 'tar');
		});

		it('can sort documents', async () => {
			let docs = await utils.find('test', {_id: {$in: ids}}, {sort: {foo: -1}});

			assert.equal(utils.pool.pool.borrowed, 0);

			assert.isArray(docs);
			assert.equal(docs.length, 2);
			assert.property(docs[0], 'tar');
			assert.property(docs[1], 'tar');
			assert.equal(docs[0].tar, 'car');
			assert.equal(docs[1].tar, 'bar');
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.find();
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});


	describe('findOne()', () => {
		let ids;

		before(async () => {
			let insertResult = await connection.collection('test').insertMany([{
				foo: 'bar',
				tar: 'bar'
			}, {
				foo: 'car',
				tar: 'car'
			}]);

			ids = insertResult.insertedIds;

			assert.isArray(ids);
			assert.equal(ids.length, 2);
		});

		it('exists', () => {
			assert.property(utils, 'findOne');
			assert.isFunction(utils.findOne);
		});

		it('finds documents', async () => {
			let doc = await utils.findOne('test', {_id: {$in: ids}});

			assert.equal(utils.pool.pool.borrowed, 0);

			assert.isObject(doc);
			assert.isObject(doc._id);
			assert.equal(ids[0].toString(), doc._id.toString());
		});

		it('can skip results', async () => {
			let doc = await utils.findOne('test', {_id: {$in: ids}}, {skip: 1});

			assert.equal(utils.pool.pool.borrowed, 0);

			assert.isObject(doc);
			assert.isObject(doc._id);
			assert.equal(ids[1].toString(), doc._id.toString());
		});

		it('can limit fields', async () => {
			let doc = await utils.findOne('test', {_id: {$in: ids}}, {fields: {tar: 1}});

			assert.equal(utils.pool.pool.borrowed, 0);

			assert.isObject(doc);
			assert.isObject(doc._id);
			assert.notProperty(doc, 'foo');
			assert.property(doc, 'tar');
		});

		it('can sort documents', async () => {
			let doc = await utils.findOne('test', {_id: {$in: ids}}, {sort: {foo: -1}});

			assert.equal(utils.pool.pool.borrowed, 0);

			assert.isObject(doc);
			assert.property(doc, 'tar');
			assert.equal(doc.tar, 'car');
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.findOne();
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});

	describe('createIndex()', () => {
		it('exists', () => {
			assert.property(utils, 'createIndex');
			assert.isFunction(utils.createIndex);
		});

		it('creates an index', async () => {
			let newIndex = {foo: 1};
			let indexes = await connection.collection('test').listIndexes().toArray();

			for (let index of indexes) {
				if (deepEqual(index.key, newIndex)) {
					await connection.collection('test').dropIndex(index.key);
				}
			}

			await utils.createIndex('test', newIndex);
			assert.equal(utils.pool.pool.borrowed, 0);

			indexes = await connection.collection('test').listIndexes().toArray();
			for (let index of indexes) {
				if (deepEqual(index.key, newIndex)) {
					return;
				}
			}

			throw new Error('Index wasn\'t createrd');
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.createIndex();
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});


	describe('dropIndex()', () => {
		it('exists', () => {
			assert.property(utils, 'dropIndex');
			assert.isFunction(utils.dropIndex);
		});

		it('drop index', async () => {
			let newIndex = {tar: 1};

			await connection.collection('test').createIndex(newIndex);
			await utils.dropIndex('test', newIndex);

			assert.equal(utils.pool.pool.borrowed, 0);

			let indexes = await connection.collection('test').listIndexes().toArray();

			for (let index of indexes) {
				if (deepEqual(index.key, newIndex)) {
					throw new Error('Key not deleted');
				}
			}
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.dropIndex();
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});

	describe('listCollections()', () => {
		it('exists', () => {
			assert.property(utils, 'listCollections');
			assert.isFunction(utils.listCollections);
		});

		it('returns a list of collection names', async () => {
			let expected = await connection.listCollections().toArray();
			let actual = await utils.listCollections();

			assert.equal(utils.pool.pool.borrowed, 0);
			assert.deepEqual(expected, actual);
		});

		// xit('handles errors', async () => {
		// 	// MongoDB on Travis Ci doesn't trip on this error.
		// 	let errors = utils.ownErrors.length;
		//
		// 	try {
		// 		await utils.listCollections(1);
		// 	} catch (e) {
		// 		assert.equal(utils.pool.pool.borrowed, 0);
		// 		assert.equal(utils.ownErrors.length, errors + 1);
		//
		// 		return;
		// 	}
		//
		// 	throw new Error('Exception expected');
		// });
	});

	describe('collectionExists()', () => {
		it('exists', () => {
			assert.property(utils, 'collectionExists');
			assert.isFunction(utils.collectionExists);
		});

		it('returns true when collection exists', async () => {
			let collections = lodash.map(await connection.listCollections().toArray(), 'name');
			let name;

			if (collections.length < 4) {
				await connection.collection('test1').insertOne({foo: 1});
				await connection.collection('test2').insertOne({foo: 1});
				await connection.collection('test3').insertOne({foo: 1});
				await connection.collection('test4').insertOne({foo: 1});
				name = 'test4';
			} else {
				name = collections[collections.length - 1];
			}

			let actual = await utils.collectionExists(name);

			assert.equal(utils.pool.pool.borrowed, 0);
			assert.isBoolean(actual);
			assert.ok(actual);
		});

		it('returns false if collection doesn\'t exists', async () => {
			let collections = lodash.map(await connection.listCollections().toArray(), 'name');
			let name;

			if (collections.length === 0) {
				await connection.collection('test').insertOne({foo: 1});
				name = 'test1';
			} else {
				name = collections[0] + 'X';
				while (collections.indexOf(name) >= 0) {
					name += 'X';
				}
			}

			let actual = await utils.collectionExists(name);

			assert.equal(utils.pool.pool.borrowed, 0);
			assert.isBoolean(actual);
			assert.notOk(actual);
		});

		// xit('handles errors', async () => {
		// 	// MongoDB on Travis Ci doesn't trip on this error.
		// 	let errors = utils.ownErrors.length;
		//
		// 	try {
		// 		await utils.listCollections(1);
		// 	} catch (e) {
		// 		assert.equal(utils.pool.pool.borrowed, 0);
		// 		assert.equal(utils.ownErrors.length, errors + 1);
		//
		// 		return;
		// 	}
		//
		// 	throw new Error('Exception expected');
		// });
	});


	describe('dropCollection()', () => {
		it('exists', () => {
			assert.property(utils, 'dropCollection');
			assert.isFunction(utils.dropCollection);
		});

		it('drops collections', async () => {
			await connection.collection('test1').insertOne({foo: 1});

			await utils.dropCollection('test1');
			assert.equal(utils.pool.pool.borrowed, 0);

			let collections = await connection.listCollections({name: 'test1'}).toArray();

			assert.equal(collections.length, 0);
		});

		it('handles errors', async () => {
			let errors = utils.ownErrors.length;

			try {
				await utils.dropCollection(null);
			} catch (e) {
				assert.equal(utils.pool.pool.borrowed, 0);
				assert.equal(utils.ownErrors.length, errors + 1);

				return;
			}

			throw new Error('Exception expected');
		});
	});
});

