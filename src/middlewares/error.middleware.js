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

  const status = err.status || 500;
  res.status(status).json({ ok: false, mensaje: err.message || 'Error interno del servidor' });
}

module.exports = { notFound, errorHandler };
