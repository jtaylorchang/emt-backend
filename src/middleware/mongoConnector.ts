import { Db, MongoClient } from 'mongodb';

export let client: MongoClient | null = null;
export let db: Db | null = null;

/**
 * Middleware to connect or reuse existing connections to Mongo
 */
const mongoConnector = ({
  databaseURI,
  connectionOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
  shouldClose = false
}) => ({
  before: async () => {
    if (db) {
      console.log('=> Using existing MongoDB connection');
    } else {
      console.log('=> Using new MongoDB connection');

      try {
        client = await MongoClient.connect(databaseURI, connectionOpts);

        db = client.db('EMT');

        console.log('=> Connection success');
      } catch (error) {
        console.error('=> Connection error with MongoDB', error);
      }
    }
  },
  after: async () => {
    if (shouldClose) {
      console.log('=> Closing MongoDB connection');

      await client?.close();
      client = null;
      db = null;
    }
  }
});

export default mongoConnector;
