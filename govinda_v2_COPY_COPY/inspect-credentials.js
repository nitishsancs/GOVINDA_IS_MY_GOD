const { MongoClient } = require('./web/node_modules/mongodb');

async function run() {
  const uri = process.env.MONGO_URI?.trim() || "mongodb://127.0.0.1:27017";
  const authDbName = (process.env.AUTH_DB_NAME || "govinda_auth").trim();
  const appDbName = (process.env.MONGO_DB_NAME || process.env.BACKEND_DB_NAME || "govinda_v2").trim();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log(`Connected to ${uri}`);

    const dbList = await client.db().admin().listDatabases();
    console.log("\nAvailable databases:");
    for (const db of dbList.databases) {
      console.log(` - ${db.name}`);
    }

    const authDb = client.db(authDbName);
    const userCol = authDb.collection('user');
    const accountCol = authDb.collection('account');

    const hasUserCol = await authDb.listCollections({ name: 'user' }).hasNext();
    if (hasUserCol) {
      const users = await userCol.find({}, { projection: { _id: 0 } }).toArray();
      console.log(`\n=== ${authDb.databaseName}.user (${users.length}) ===`);
      for (const u of users) {
        console.log(`${(u.role || '').padEnd(14)} | ${(u.team || '').padEnd(40)} | ${u.email}`);
      }
      const roleCounts = users.reduce((acc, u) => {
        const key = u.role || "(none)";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      console.log("\nRoles summary:");
      for (const [role, count] of Object.entries(roleCounts)) {
        console.log(` - ${role}: ${count}`);
      }
    } else {
      console.log(`\n=== ${authDb.databaseName}.user : collection not found ===`);
    }

    const hasAccountCol = await authDb.listCollections({ name: 'account' }).hasNext();
    if (hasAccountCol) {
      const accounts = await accountCol.find({}, { projection: { _id: 0 } }).toArray();
      console.log(`\n=== ${authDb.databaseName}.account (${accounts.length}) ===`);
      for (const acc of accounts) {
        console.log(`${acc.accountId} -> hash: ${acc.password}`);
      }
    } else {
      console.log(`\n=== ${authDb.databaseName}.account : collection not found ===`);
    }

    const appDb = client.db(appDbName);
    const appUsersCol = appDb.collection('users');
    const hasAppUsers = await appDb.listCollections({ name: 'users' }).hasNext();
    if (hasAppUsers) {
      const appUsers = await appUsersCol.find({}, { projection: { _id: 0 } }).toArray();
      console.log(`\n=== ${appDb.databaseName}.users (${appUsers.length}) ===`);
      for (const u of appUsers) {
        console.log(JSON.stringify(u));
      }
    } else {
      console.log(`\n=== ${appDb.databaseName}.users : collection not found ===`);
    }
  } finally {
    await client.close();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
