import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const restoreDatabase = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing from environment!');
    process.exit(1);
  }

  const backupFolderName = process.argv[2];
  if (!backupFolderName) {
    console.error('Please specify the backup folder name (e.g. backup-2026-07-08T18-44-03)');
    process.exit(1);
  }

  const backupDir = path.join(process.cwd(), 'backups', backupFolderName);
  if (!fs.existsSync(backupDir)) {
    console.error(`Backup directory not found: ${backupDir}`);
    process.exit(1);
  }

  console.log(`Connecting to database for restore...`);
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const collName = path.basename(file, '.json');
    console.log(`Restoring collection: ${collName}...`);

    const fileContent = fs.readFileSync(path.join(backupDir, file), 'utf8');
    const documents = JSON.parse(fileContent);

    if (documents.length > 0) {
      await db.collection(collName).deleteMany({});
      
      const mappedDocs = documents.map(doc => {
        if (doc._id && typeof doc._id === 'object' && doc._id.$oid) {
          doc._id = new mongoose.Types.ObjectId(doc._id.$oid);
        } else if (doc._id && typeof doc._id === 'string') {
          doc._id = new mongoose.Types.ObjectId(doc._id);
        }
        return doc;
      });
      await db.collection(collName).insertMany(mappedDocs);
    }
  }

  console.log(`Restore completed successfully from: ${backupDir}`);
  await mongoose.disconnect();
};

restoreDatabase().catch(err => {
  console.error('Restore failed:', err);
  process.exit(1);
});
