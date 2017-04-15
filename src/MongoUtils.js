let mongodb = require('mongodb');
let ObjectID = mongodb.ObjectID;
// let Decimal128 = mongodb.Decimal128;

let MongoPool = require('./MongoPool');

class MongoUtils {

	/**
	 * Constructor.
	 *
	 * @param {MongoPool} pool MongoPool instance.
	 */
	constructor(pool) {
		if (!(pool instanceof MongoPool)) {
			throw new Error('MongoPool object expected');
		}

		this.pool = pool;
	}

	/* istanbul ignore next */
	/**
	 * Log error.
	 * Replace this with your own function.
	 *
	 * @param {Error} err Error object.
	 * @returns {undefined}
	 */
	logError(err) {
		console.error(err.stack);
	}

	/**
	 * Cast string _id field to ObjectID.
	 *
	 * @param {Object} document Document to handle.
	 * @returns {undefined}
	 */
	castId(document) {
		if (!document) {
			return;
		}

		if (typeof document._id === 'string') {
			document._id = new ObjectID(document._id);
		}
	}

	/**
	 * Insert a single document to a collection.
	 *
	 * @param {String} collectionName Collection name.
	 * @param {Object} document Document to insert.
	 * @returns {ObjectID} Returns the ID of inserted object.
	 */
	async insertOne(collectionName, document) {
		let result, collection;
		let db = await this.pool.acquire();

		try {
			this.castId(document);
			collection = db.collection(collectionName);
			result = await collection.insertOne(document, {});
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}

		return result.insertedId;
	}

	/**
	 * Insert an array of documents to a collection.
	 *
	 * @param {string} collectionName Collection name.
	 * @param {Object[]} documents Array of documents to insert.
	 * @returns {ObjectID[]} Returns array of document IDs.
	 */
	async insertMany(collectionName, documents) {
		let result, collection;
		let db = await this.pool.acquire();

		try {
			documents.forEach(this.castId);

			collection = db.collection(collectionName);
			result = await collection.insertMany(documents, {});
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}

		return result.insertedIds;
	}

	async updateOne(collectionName, filter, update) {
		let result, collection;
		let db = await this.pool.acquire();

		try {
			this.castId(filter);
			this.castId(update);
			collection = db.collection(collectionName);
			result = await collection.updateOne(filter, update);
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}

		return result.modifiedCount;
	}

	async updateMany(collectionName, filter, update) {
		let result, collection;
		let db = await this.pool.acquire();

		try {
			this.castId(filter);
			this.castId(update);
			collection = db.collection(collectionName);
			result = await collection.updateMany(filter, update);
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}

		return result.modifiedCount;
	}

	async deleteOne(collectionName, filter) {
		let result;
		let db = await this.pool.acquire();

		try {
			this.castId(filter);
			result = await db.collection(collectionName).deleteOne(filter);
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}

		return result.deletedCount;
	}

	async deleteMany(collectionName, filter) {
		let result;
		let db = await this.pool.acquire();

		try {
			this.castId(filter);
			result = await db.collection(collectionName).deleteMany(filter);
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}

		return result.deletedCount;
	}

	/**
	 * Count object within a collection matching specified query.
	 *
	 * @param {String} collectionName Collection name.
	 * @param {Object} [query] Query object.
	 * @returns {Number} The number of documents.
	 */
	async count(collectionName, query) {
		let result, collection;
		let db = await
			this.pool.acquire();

		try {
			this.castId(query);
			collection = db.collection(collectionName);
			let cursor = collection.find(query);

			result = await cursor.count();
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}

		return result;
	}


	async find(collectionName, query, options) {
		let result, collection;
		let db = await this.pool.acquire();

		try {
			this.castId(query);
			collection = db.collection(collectionName);
			let cursor = collection.find(query);

			if (options) {
				if (options.skip) {
					cursor = cursor.skip(options.skip);
				}

				if (options.limit) {
					cursor = cursor.limit(options.limit);
				}

				if (options.fields) {
					cursor = cursor.project(options.fields);
				}

				if (options.sort) {
					cursor = cursor.sort(options.sort);
				}
			}

			result = await cursor.toArray();
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}

		return result;
	}

	async findOne(collectionName, query, options) {
		let result, collection;
		let db = await this.pool.acquire();

		try {
			this.castId(query);
			collection = db.collection(collectionName);
			let cursor = collection.find(query);

			if (options) {
				if (options.skip) {
					cursor = cursor.skip(options.skip);
				}

				if (options.fields) {
					cursor = cursor.project(options.fields);
				}

				if (options.sort) {
					cursor = cursor.sort(options.sort);
				}
			}

			cursor.limit(1);

			result = await cursor.next();
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}

		return result;
	}

	/**
	 * Create an index.
	 *
	 * @param {string} collectionName Collection name.
	 * @param {string|object} fieldOrSpec Field name or fields specification object.
	 * @param {object} [options] Index options.
	 * @returns {undefined}
	 */
	async createIndex(collectionName, fieldOrSpec, options) {
		let collection;
		let db = await this.pool.acquire();

		try {
			collection = db.collection(collectionName);
			await collection.createIndex(fieldOrSpec, options);
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}
	}

	/**
	 * Drop index.
	 * @param {string} collectionName Collection name.
	 * @param {string} indexName The name of the index.
	 * @param {object} [options] Index options.
	 * @returns {undefined}
	 */
	async dropIndex(collectionName, indexName, options) {
		let collection;
		let db = await this.pool.acquire();

		try {
			collection = db.collection(collectionName);
			await collection.dropIndex(indexName, options);
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}
	}

	/**
	 * List collections in database.
	 *
	 * @param {object} [filter] Collection filter.
	 * @param {object} [options] Index options.
	 * @returns {string[]} Array of collection names.
	 */
	async listCollections(filter, options) {
		let result;
		let db = await this.pool.acquire();

		try {
			result = await db.listCollections(filter, options).toArray();
			this.pool.release(db);
		} catch (e)
			/* istanbul ignore next */
		{
			this.logError(e);
			this.pool.release(db);
			throw e;
		}

		return result;
	}

	/**
	 * Check if collection exists.
	 *
	 * Returns true if it exists, false otherwise.
	 *
	 * @param {string} collectionName Collection name.
	 * @returns {boolean} True if collection exists, false otherwise.
	 */
	async collectionExists(collectionName) {
		let collections = await this.listCollections({name: collectionName});

		if (collections.length) {
			return true;
		}

		return false;
	}

	/**
	 * Drop collection.
	 *
	 * @param {string} collectionName Collection name.
	 * @returns {undefined}
	 */
	async dropCollection(collectionName) {
		let db = await this.pool.acquire();

		try {
			await db.dropCollection(collectionName);
			this.pool.release(db);
		} catch (e) {
			this.logError(e);
			this.pool.release(db);
			throw e;
		}
	}

}

// ObjectID: ObjectID,

module.exports = MongoUtils;
