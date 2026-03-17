const { MongoClient } = require('./web/node_modules/mongodb');
const fs = require('fs');
const path = require('path');

const DEFAULT_URI = process.env.MONGO_URI
    || process.env.MONGODB_URI
    || 'mongodb+srv://nitishsancs_db_user:OnHAmRujzopi4EpD@govinda.mdyhulj.mongodb.net/?appName=govinda';
const DEFAULT_DB = process.env.MONGO_DB || process.env.BACKEND_DB_NAME || 'govinda_v2';

async function restoreFromBackup(backupDir) {
    if (!fs.existsSync(backupDir)) {
        throw new Error(`Backup directory not found: ${backupDir}`);
    }

    const client = new MongoClient(DEFAULT_URI);
    try {
        await client.connect();
        console.log(`✅ Connected to MongoDB`);
        
        const db = client.db(DEFAULT_DB);
        
        // First, drop all existing collections
        console.log(`\n🗑️  Dropping all existing collections from ${DEFAULT_DB}...\n`);
        const existingCollections = await db.listCollections().toArray();
        for (const collInfo of existingCollections) {
            await db.collection(collInfo.name).drop();
            console.log(`   ✓ Dropped: ${collInfo.name}`);
        }
        
        // Now restore from backup
        console.log(`\n📦 Restoring collections from: ${backupDir}\n`);
        
        const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
            const collectionName = path.basename(file, '.json');
            const filePath = path.join(backupDir, file);
            
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (data.length > 0) {
                const coll = db.collection(collectionName);
                await coll.insertMany(data);
                console.log(`   ✓ ${collectionName}: ${data.length} documents restored`);
            } else {
                console.log(`   ⊘ ${collectionName}: empty (skipped)`);
            }
        }
        
        console.log(`\n✅ Restore complete from ${backupDir}\n`);
        
    } catch (error) {
        console.error('❌ Restore failed:', error);
        throw error;
    } finally {
        await client.close();
    }
}

async function main() {
    const backupDir = process.argv[2] || path.join(__dirname, 'backup_2026-03-17T11-22-06');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  GOVINDA v2 DATABASE RESTORE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Database: ${DEFAULT_DB}`);
    console.log(`Backup: ${backupDir}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    try {
        await restoreFromBackup(backupDir);
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  ✅ RESTORE COMPLETE');
        console.log('═══════════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('\n═══════════════════════════════════════════════════════════');
        console.error('  ❌ RESTORE FAILED');
        console.error('═══════════════════════════════════════════════════════════');
        console.error(error);
        console.error('═══════════════════════════════════════════════════════════\n');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { restoreFromBackup };
