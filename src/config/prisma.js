const { PrismaClient } = require('@prisma/client');

// Instancia única de Prisma reutilizada en toda la app
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
