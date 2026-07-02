import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart';
const BACKUP_DIR = path.join(process.cwd(), 'backups');

const connectDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI);
  }
};

const runBackup = async () => {
  try {
    console.log('[Backup] Connecting to MongoDB...');
    await connectDB();
    console.log('[Backup] Database connected.');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const targetDir = path.join(BACKUP_DIR, `backup-${timestamp}`);

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    console.log(`[Backup] Starting export of ${collections.length} collections to ${targetDir}...`);

    for (const colInfo of collections) {
      const colName = colInfo.name;
      // Skip system collections or index specs if any
      if (colName.startsWith('system.')) continue;

      const data = await db.collection(colName).find({}).toArray();
      const filePath = path.join(targetDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[Backup] Exported ${data.length} documents from "${colName}"`);
    }

    console.log(`[Backup] Database backup completed successfully at: ${targetDir}`);
    process.exit(0);
  } catch (error) {
    console.error('[Backup Error] Backup operation failed:', error);
    process.exit(1);
  }
};

const runRestore = async (backupFolder) => {
  if (!backupFolder) {
    console.error('[Restore Error] Please specify a backup directory path. Example: node backupDatabase.js --restore backup-2026-06-26T00-00-00');
    process.exit(1);
  }

  const targetDir = path.isAbsolute(backupFolder) ? backupFolder : path.join(BACKUP_DIR, backupFolder);

  if (!fs.existsSync(targetDir)) {
    console.error(`[Restore Error] Specified backup directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  try {
    console.log('[Restore] Connecting to MongoDB...');
    await connectDB();
    console.log('[Restore] Database connected.');

    const db = mongoose.connection.db;
    const files = fs.readdirSync(targetDir).filter((file) => file.endsWith('.json'));

    if (files.length === 0) {
      console.warn(`[Restore] No JSON collection dumps found in ${targetDir}`);
      process.exit(0);
    }

    console.log(`[Restore] Restoring ${files.length} collections from ${targetDir}...`);

    for (const file of files) {
      const colName = file.replace('.json', '');
      const filePath = path.join(targetDir, file);
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const docs = JSON.parse(rawData);

      // Clear existing collection
      console.log(`[Restore] Clearing existing collection: "${colName}"...`);
      await db.collection(colName).deleteMany({});

      if (docs.length > 0) {
        // Convert string IDs back to MongoDB ObjectIds if necessary, or insert raw (since Mongoose/MongoDB parses them)
        const parsedDocs = docs.map((doc) => {
          if (doc._id && typeof doc._id === 'object' && doc._id.$oid) {
            doc._id = new mongoose.Types.ObjectId(doc._id.$oid);
          }
          // Convert date strings back to dates if they match $date format
          for (const key in doc) {
            if (doc[key] && typeof doc[key] === 'object' && doc[key].$date) {
              doc[key] = new Date(doc[key].$date);
            }
          }
          return doc;
        });

        console.log(`[Restore] Inserting ${parsedDocs.length} documents into "${colName}"...`);
        await db.collection(colName).insertMany(parsedDocs);
      }
      console.log(`[Restore] Restored collection "${colName}" successfully.`);
    }

    console.log('[Restore] Database restoration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Restore Error] Restoration failed:', error);
    process.exit(1);
  }
};

// Command Line Handler
const args = process.argv.slice(2);
if (args.includes('--backup')) {
  runBackup();
} else if (args.includes('--restore')) {
  const index = args.indexOf('--restore');
  runRestore(args[index + 1]);
} else {
  console.log(`
MongoDB Portable Backup Utility
Usage:
  Backup:  node backend/scripts/backupDatabase.js --backup
  Restore: node backend/scripts/backupDatabase.js --restore <backup-folder-name>
  `);
  process.exit(0);
}
