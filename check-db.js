const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    // Проверяем подключение
    await prisma.$connect();
    console.log('✓ Connected to database');
    
    // Проверяем текущую структуру таблицы
    const result = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'kb_media'
      ORDER BY ordinal_position;
    `;
    
    console.log('\nТекущая структура таблицы kb_media:');
    console.table(result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
