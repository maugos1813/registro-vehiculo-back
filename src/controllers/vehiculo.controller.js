const prisma = require('../config/prisma');

// GET /api/vehiculos -> lista (usada para poblar el dropdown en la app)
async function listar(req, res, next) {
  try {
    const { activo } = req.query;
    const where = activo !== undefined ? { activo: activo === 'true' } : {};
    const vehiculos = await prisma.vehiculo.findMany({
      where,
      orderBy: { targa: 'asc' },
    });
    res.json({ ok: true, data: vehiculos });
  } catch (err) {
    next(err);
  }
}

// GET /api/vehiculos/:id
async function obtener(req, res, next) {
  try {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!vehiculo) return res.status(404).json({ ok: false, mensaje: 'Vehículo no encontrado' });
    res.json({ ok: true, data: vehiculo });
  } catch (err) {
    next(err);
  }
}

// POST /api/vehiculos
async function crear(req, res, next) {
  try {
    const { targa, modelo, activo } = req.body;
    if (!targa || !targa.trim()) {
      return res.status(400).json({ ok: false, mensaje: 'La targa del vehículo es obligatoria' });
    }
    const vehiculo = await prisma.vehiculo.create({
      data: { targa: targa.trim().toUpperCase(), modelo, activo: activo ?? true },
    });
    res.status(201).json({ ok: true, data: vehiculo });
  } catch (err) {
    next(err);
  }
}

// PUT /api/vehiculos/:id
async function actualizar(req, res, next) {
  try {
    const { targa, modelo, activo } = req.body;
    const vehiculo = await prisma.vehiculo.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(targa !== undefined && { targa: targa.trim().toUpperCase() }),
        ...(modelo !== undefined && { modelo }),
        ...(activo !== undefined && { activo }),
      },
    });
    res.json({ ok: true, data: vehiculo });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/vehiculos/:id
async function eliminar(req, res, next) {
  try {
    await prisma.vehiculo.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true, mensaje: 'Vehículo eliminado' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
