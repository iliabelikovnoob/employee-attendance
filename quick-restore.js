const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function quickRestore() {
  console.log('🔄 Быстрое восстановление учетных записей...\n');

  try {
    // Админ
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@company.com' },
      update: {},
      create: {
        email: 'admin@company.com',
        password: adminPassword,
        role: 'ADMIN',
        name: 'Администратор',
        position: 'Руководитель',
        phone: '+7 (999) 123-45-67',
        vacationDays: 28,
      },
    });
    console.log('✅ Создан:', admin.email, '(Администратор)');

    // Пользователь
    const userPassword = await bcrypt.hash('user123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'user@company.com' },
      update: {},
      create: {
        email: 'user@company.com',
        password: userPassword,
        role: 'USER',
        name: 'Иван Петров',
        position: 'Разработчик',
        phone: '+7 (999) 765-43-21',
        vacationDays: 28,
      },
    });
    console.log('✅ Создан:', user.email, '(Пользователь)');

    console.log('\n🎉 Готово! Теперь можно войти:\n');
    console.log('👨‍💼 АДМИНИСТРАТОР:');
    console.log('   📧 Email: admin@company.com');
    console.log('   🔑 Пароль: admin123\n');
    console.log('👤 ПОЛЬЗОВАТЕЛЬ:');
    console.log('   📧 Email: user@company.com');
    console.log('   🔑 Пароль: user123\n');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

quickRestore()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
