import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();
const BACKUP_DIR = path.join(__dirname, 'backups');

export const runBackup = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not configured in env.');
    process.exit(1);
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const collections = await mongoose.connection.db.listCollections().toArray();
  const backupData = {};

  console.log(`Starting database backup for ${collections.length} collections...`);

  for (const coll of collections) {
    const name = coll.name;
    const docs = await mongoose.connection.db.collection(name).find({}).toArray();
    backupData[name] = docs;
    console.log(`Dumped ${docs.length} documents from collection "${name}"`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup-${timestamp}.json.gz`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  const serialized = JSON.stringify(backupData);
  const compressed = zlib.gzipSync(serialized);

  fs.writeFileSync(backupPath, compressed);
  console.log(`Backup completed successfully: ${backupPath} (${compressed.length} bytes)`);

  await mongoose.disconnect();
  return backupFileName;
};

if (process.argv[1] && (process.argv[1].endsWith('backup.js') || process.argv[1].endsWith('backup'))) {
  runBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Backup failed:', err);
      process.exit(1);
    });
}
