const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      take: 20,
    });

    if (users.length === 0) {
      console.log('Nenhum usuário encontrado no banco de dados.');
    } else {
      console.log(`\nTotal de usuários: ${users.length}\n`);
      console.table(users);
    }
  } catch (error) {
    console.error('Erro ao consultar usuários:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
