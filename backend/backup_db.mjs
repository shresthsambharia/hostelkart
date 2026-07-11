import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const backupDatabase = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing from environment!');
    process.exit(1);
  }

  console.log('Connecting to database for backup...');
  await mongoose.connect(mongoUri);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', `backup-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  for (const collInfo of collections) {
    const collName = collInfo.name;
    console.log(`Backing up collection: ${collName}...`);
    const documents = await db.collection(collName).find({}).toArray();
    const filePath = path.join(backupDir, `${collName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
  }

  console.log(`Backup completed successfully! Files saved to: ${backupDir}`);
  await mongoose.disconnect();
};

backupDatabase().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
