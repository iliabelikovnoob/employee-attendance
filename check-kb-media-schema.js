const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    // Проверяем структуру таблицы kb_media
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'kb_media'
      ORDER BY ordinal_position;
    `;

    console.log('Структура таблицы kb_media:');
    console.log(JSON.stringify(result, null, 2));

    // Проверяем примененные миграции
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC;
    `;

    console.log('\n\nПримененные миграции:');
    console.log(JSON.stringify(migrations, null, 2));

  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
