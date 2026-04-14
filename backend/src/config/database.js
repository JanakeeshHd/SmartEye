import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smarteye';

mongoose.connect(uri)
  .then(() => {
    console.log('📦 Connected to MongoDB');
    
    // Create indexes
    Models.users.collection.createIndex({ email: 1 }, { unique: true }).catch(() => {});
    Models.issues.collection.createIndex({ status: 1 }).catch(() => {});
    Models.issues.collection.createIndex({ reportedBy: 1 }).catch(() => {});
    Models.issues.collection.createIndex({ assignedTo: 1 }).catch(() => {});
    Models.notifications.collection.createIndex({ userId: 1 }).catch(() => {});
  })
  .catch(err => console.error('MongoDB connection error:', err));

const createModel = (name) => {
  const schema = new mongoose.Schema({
    _id: { type: String }
  }, { strict: false, versionKey: false });
  return mongoose.model(name, schema);
};

const Models = {
  users: createModel('User'),
  issues: createModel('Issue'),
  comments: createModel('Comment'),
  notifications: createModel('Notification')
};

const wrapModel = (model) => ({
  find: (query = {}) => model.find(query),
  findOne: (query) => model.findOne(query),
  insert: (doc) => model.create(doc),
  update: (query, updateTarget, options = {}) => {
    if (options.multi) {
      return model.updateMany(query, updateTarget);
    }
    return model.updateOne(query, updateTarget);
  },
  count: (query) => model.countDocuments(query)
});

const db = {
  users: wrapModel(Models.users),
  issues: wrapModel(Models.issues),
  comments: wrapModel(Models.comments),
  notifications: wrapModel(Models.notifications)
};

export default db;
