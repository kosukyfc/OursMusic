const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Conexão Supabase OK!', result);
    
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' LIMIT 10
    `;
    console.log('✅ Tabelas:', tables);
  } catch (e) {
    console.error('❌ Erro:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
