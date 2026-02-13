const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigration() {
  // Read DATABASE_URL from .env
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  const databaseUrl = envContent.match(/DATABASE_URL="(.+)"/)[1];

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const migrationPath = path.join(__dirname, 'prisma/migrations/20260211_update_kb_media/migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`\nExecuting ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] ${statement.substring(0, 80)}...`);
      try {
        await client.query(statement);
        console.log('  ✓ Success\n');
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}\n`);
        throw error;
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
