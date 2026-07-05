// Script único para crear el primer usuario ADMIN (o cualquier admin adicional).
// Uso: node scripts/crearAdmin.js correo@ejemplo.com miPasswordSegura
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');

async function main() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error('Uso: node scripts/crearAdmin.js <email> <password>');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('La password debe tener al menos 6 caracteres');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email: email.trim().toLowerCase() },
    update: { password: passwordHash, rol: 'ADMIN', activo: true },
    create: { email: email.trim().toLowerCase(), password: passwordHash, rol: 'ADMIN' },
  });

  console.log(`Usuario ADMIN listo: ${usuario.email} (id ${usuario.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
