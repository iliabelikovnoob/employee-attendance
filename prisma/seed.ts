import { PrismaClient, Role, AttendanceStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Хешируем пароли
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  // Создаем администратора
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      password: adminPassword,
      role: Role.ADMIN,
      name: 'Администратор Системы',
      phone: '+7 (999) 123-45-67',
      position: 'Руководитель отдела',
      skills: 'Управление проектами, анализ данных, координация команды',
    },
  });

  // Создаем обычного сотрудника
  const user = await prisma.user.upsert({
    where: { email: 'user@company.com' },
    update: {},
    create: {
      email: 'user@company.com',
      password: userPassword,
      role: Role.USER,
      name: 'Иван Петров',
      phone: '+7 (999) 765-43-21',
      position: 'Senior Full-Stack Developer',
      skills: 'React, Next.js, TypeScript, Node.js, PostgreSQL, Docker',
    },
  });

  // Создаем еще несколько тестовых сотрудников
  const user2 = await prisma.user.create({
    data: {
      email: 'maria@company.com',
      password: userPassword,
      role: Role.USER,
      name: 'Мария Сидорова',
      phone: '+7 (999) 111-22-33',
      position: 'Frontend Developer',
      skills: 'React, Vue.js, CSS, HTML, JavaScript',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'alex@company.com',
      password: userPassword,
      role: Role.USER,
      name: 'Александр Козлов',
      phone: '+7 (999) 444-55-66',
      position: 'Backend Developer',
      skills: 'Node.js, Python, Django, REST API, GraphQL',
    },
  });

  console.log('✅ Users created:', { admin, user, user2, user3 });

  // Создаем несколько записей о присутствии для демонстрации
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Записи на текущий месяц
  for (let i = -5; i <= 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    // Для администратора
    await prisma.attendance.create({
      data: {
        userId: admin.id,
        date,
        status: i === 0 ? AttendanceStatus.OFFICE : 
                i > 0 ? AttendanceStatus.OFFICE : 
                AttendanceStatus.REMOTE,
      },
    });

    // Для пользователя
    await prisma.attendance.create({
      data: {
        userId: user.id,
        date,
        status: i === -3 ? AttendanceStatus.SICK :
                i === 2 ? AttendanceStatus.VACATION :
                i % 2 === 0 ? AttendanceStatus.OFFICE : 
                AttendanceStatus.REMOTE,
      },
    });

    // Для второго пользователя
    await prisma.attendance.create({
      data: {
        userId: user2.id,
        date,
        status: i === 1 ? AttendanceStatus.DAYOFF :
                i % 3 === 0 ? AttendanceStatus.REMOTE : 
                AttendanceStatus.OFFICE,
      },
    });

    // Для третьего пользователя
    await prisma.attendance.create({
      data: {
        userId: user3.id,
        date,
        status: i === -2 ? AttendanceStatus.VACATION :
                i > 0 ? AttendanceStatus.OFFICE : 
                AttendanceStatus.REMOTE,
      },
    });
  }

  console.log('✅ Attendance records created');

  // Создаем тестовый запрос на изменение
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.attendanceRequest.create({
    data: {
      userId: user.id,
      date: tomorrow,
      newStatus: AttendanceStatus.SICK,
      reason: 'Плохое самочувствие, температура 37.5',
    },
  });

  console.log('✅ Test request created');
  console.log('\n📋 Credentials:');
  console.log('  ADMIN: admin@company.com / admin123');
  console.log('  USER:  user@company.com / user123\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
