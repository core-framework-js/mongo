let assert = require('chai').assert;

let index = require('../src/index');
let MongoUtils = require('../src/MongoUtils');
let MongoPool = require('../src/MongoPool');
let mongodb = require('mongodb');


describe('index.js', () => {
	describe('exports classes', () => {
		it('MongoUtils', () => {
			assert.property(index, 'MongoUtils');
			assert.isFunction(index.MongoUtils);
			assert.ok(index.MongoUtils === MongoUtils);
		});

		it('MongoPool', () => {
			assert.property(index, 'MongoPool');
			assert.isFunction(index.MongoPool);
			assert.ok(index.MongoPool === MongoPool);
		});

		it('lib', () => {
			assert.property(index, 'lib');
			assert.isFunction(index.lib);
			assert.ok(index.lib === mongodb);
		});
	});
});
