import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function restoreAccounts() {
  console.log('🔄 Восстановление учетных записей...');

  try {
    // Создаем администратора
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@company.com' },
      update: {},
      create: {
        email: 'admin@company.com',
        password: adminPassword,
        name: 'Администратор',
        role: 'ADMIN',
        position: 'Руководитель',
        phone: '+7 (999) 123-45-67',
        vacationDays: 28,
      },
    });
    console.log('✅ Создан администратор:', admin.email);

    // Создаем тестовых сотрудников
    const users = [
      {
        email: 'belikov@company.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Беликов Иван',
        role: 'USER',
        position: 'Старший разработчик',
        phone: '+7 (999) 111-11-11',
        skills: 'React, Node.js, TypeScript',
        vacationDays: 28,
      },
      {
        email: 'ivanov@company.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Иванов Алексей',
        role: 'USER',
        position: 'Frontend разработчик',
        phone: '+7 (999) 222-22-22',
        skills: 'Vue.js, JavaScript',
        vacationDays: 28,
      },
      {
        email: 'petrov@company.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Петров Сергей',
        role: 'USER',
        position: 'Backend разработчик',
        phone: '+7 (999) 333-33-33',
        skills: 'Python, Django',
        vacationDays: 28,
      },
      {
        email: 'sidorov@company.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Сидоров Дмитрий',
        role: 'USER',
        position: 'DevOps инженер',
        phone: '+7 (999) 444-44-44',
        skills: 'Docker, Kubernetes',
        vacationDays: 28,
      },
      {
        email: 'kuznetsov@company.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Кузнецов Евгений',
        role: 'USER',
        position: 'QA инженер',
        phone: '+7 (999) 555-55-55',
        skills: 'Selenium, Jest',
        vacationDays: 28,
      },
    ];

    for (const userData of users) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: userData as any,
      });
      console.log('✅ Создан пользователь:', user.email);
    }

    console.log('\n✨ Восстановление завершено!');
    console.log('\n📋 Учетные данные для входа:');
    console.log('\n👨‍💼 АДМИНИСТРАТОР:');
    console.log('   Email: admin@company.com');
    console.log('   Пароль: admin123');
    console.log('\n👥 СОТРУДНИКИ:');
    console.log('   Email: belikov@company.com');
    console.log('   Email: ivanov@company.com');
    console.log('   Email: petrov@company.com');
    console.log('   Email: sidorov@company.com');
    console.log('   Email: kuznetsov@company.com');
    console.log('   Пароль для всех: password123');
    console.log('\n');

  } catch (error) {
    console.error('❌ Ошибка при восстановлении:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreAccounts()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
