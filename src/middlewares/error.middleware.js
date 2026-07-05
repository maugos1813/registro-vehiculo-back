const multer = require('multer');

// 404 - ruta no encontrada
function notFound(req, res, next) {
  res.status(404).json({ ok: false, mensaje: `Ruta no encontrada: ${req.originalUrl}` });
}

// Manejador de errores general
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ ok: false, mensaje: `Error al subir archivo: ${err.message}` });
  }

  if (err.code === 'P2002') {
    // Prisma: violación de constraint único
    return res.status(409).json({ ok: false, mensaje: 'Registro duplicado (valor único ya existe).' });
  }

  if (err.code === 'P2025') {
    // Prisma: registro no encontrado
    return res.status(404).json({ ok: false, mensaje: 'Recurso no encontrado.' });
  }

  // Violación de foreign key (ej. borrar un chofer/vehículo que todavía tiene registros).
  // Prisma la reporta como P2002 conocido (P2003) cuando la emula él mismo, pero cuando la
  // restricción vive directo en Postgres (nuestro caso, ON DELETE RESTRICT) llega como un
  // PrismaClientUnknownRequestError sin código, con el detalle en el mensaje.
  const esViolacionForeignKey =
    err.code === 'P2003' || /violat(es|ion).*foreign key|RESTRICT setting/i.test(err.message || '');
  if (esViolacionForeignKey) {
    return res.status(409).json({
      ok: false,
      mensaje: 'No se puede eliminar: tiene otros datos asociados (registros u otra referencia).',
    });
  }

  const status = err.status || 500;
  res.status(status).json({ ok: false, mensaje: err.message || 'Error interno del servidor' });
}

module.exports = { notFound, errorHandler };
