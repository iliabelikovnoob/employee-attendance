const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const prisma = new PrismaClient();

  try {
    const migrationPath = path.join(__dirname, 'prisma/migrations/20260211_update_kb_media/migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} statements...`);

    for (const statement of statements) {
      console.log('\nExecuting:', statement.substring(0, 100) + '...');
      await prisma.$executeRawUnsafe(statement);
      console.log('✓ Success');
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
