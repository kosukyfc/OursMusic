const { PrismaClient } = require('./node_modules/@prisma/client');
const bcrypt = require('./node_modules/bcrypt');

async function test() {
  const prisma = new PrismaClient();
  
  const user = await prisma.user.findUnique({ where: { email: 'kosuknunes@gmail.com' } });
  
  console.log('email:', user.email);
  console.log('hash repr:', JSON.stringify(user.passwordHash));
  console.log('hash length:', user.passwordHash.length);
  console.log('trimmed:', JSON.stringify(user.passwordHash.trim()));
  console.log('starts $2b$:', user.passwordHash.trim().startsWith('$2b$'));
  
  const ok = await bcrypt.compare('oursmusic123', user.passwordHash.trim());
  console.log('bcrypt match:', ok);
  
  await prisma.$disconnect();
}

test().catch(console.error);
