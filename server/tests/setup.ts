import { afterAll, afterEach, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

let mongo: MongoMemoryServer | undefined;

beforeAll(async () => {
  // Use an existing MongoDB when MONGO_URI_TEST is set, otherwise start an in-memory one.
  let uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    mongo = await MongoMemoryServer.create();
    uri = mongo.getUri();
  }
  await mongoose.connect(uri, { dbName: `remotehire_test_${process.pid}` });
});

afterEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  if (process.env.MONGO_URI_TEST) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongo?.stop();
});
