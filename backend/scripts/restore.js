import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const runRestore = async (backupFileName) => {
  if (!backupFileName) {
    console.error('Please specify the backup filename (e.g. backup-YYYY-MM-DD_HH-mm-ss.json.gz).');
    process.exit(1);
  }

  const __dirname = path.resolve();
  const backupPath = path.isAbsolute(backupFileName)
    ? backupFileName
    : path.join(__dirname, 'backups', backupFileName);

  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found at: ${backupPath}`);
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not configured in env.');
    process.exit(1);
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
  }

  console.log(`Starting database restore from: ${backupPath}...`);

  const compressed = fs.readFileSync(backupPath);
  const decompressed = zlib.gunzipSync(compressed);
  const backupData = JSON.parse(decompressed.toString());

  for (const name in backupData) {
    const docs = backupData[name];
    console.log(`Restoring ${docs.length} documents to collection "${name}"...`);

    await mongoose.connection.db.collection(name).deleteMany({});

    if (docs.length > 0) {
      const mappedDocs = docs.map((doc) => {
        const cleanDoc = { ...doc };
        if (cleanDoc._id && typeof cleanDoc._id === 'string') {
          cleanDoc._id = new mongoose.Types.ObjectId(cleanDoc._id);
        }
        if (cleanDoc.user && typeof cleanDoc.user === 'string' && cleanDoc.user.length === 24) {
          cleanDoc.user = new mongoose.Types.ObjectId(cleanDoc.user);
        }
        if (cleanDoc.product && typeof cleanDoc.product === 'string' && cleanDoc.product.length === 24) {
          cleanDoc.product = new mongoose.Types.ObjectId(cleanDoc.product);
        }
        if (cleanDoc.recipient && typeof cleanDoc.recipient === 'string' && cleanDoc.recipient.length === 24) {
          cleanDoc.recipient = new mongoose.Types.ObjectId(cleanDoc.recipient);
        }
        return cleanDoc;
      });
      await mongoose.connection.db.collection(name).insertMany(mappedDocs);
    }
  }

  console.log('Database restore completed successfully!');
  await mongoose.disconnect();
};

if (process.argv[1] && (process.argv[1].endsWith('restore.js') || process.argv[1].endsWith('restore'))) {
  const fileArg = process.argv[2];
  runRestore(fileArg)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Restore failed:', err);
      process.exit(1);
    });
}
