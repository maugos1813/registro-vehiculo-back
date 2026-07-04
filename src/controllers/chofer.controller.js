const prisma = require('../config/prisma');

// GET /api/choferes  -> lista (usada para poblar el dropdown en la app)
async function listar(req, res, next) {
  try {
    const { activo } = req.query;
    const where = activo !== undefined ? { activo: activo === 'true' } : {};
    const choferes = await prisma.chofer.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
    res.json({ ok: true, data: choferes });
  } catch (err) {
    next(err);
  }
}

// GET /api/choferes/:id
async function obtener(req, res, next) {
  try {
    const chofer = await prisma.chofer.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!chofer) return res.status(404).json({ ok: false, mensaje: 'Chofer no encontrado' });
    res.json({ ok: true, data: chofer });
  } catch (err) {
    next(err);
  }
}

// POST /api/choferes
async function crear(req, res, next) {
  try {
    const { nombre, activo } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ ok: false, mensaje: 'El nombre del chofer es obligatorio' });
    }
    const chofer = await prisma.chofer.create({
      data: { nombre: nombre.trim(), activo: activo ?? true },
    });
    res.status(201).json({ ok: true, data: chofer });
  } catch (err) {
    next(err);
  }
}

// PUT /api/choferes/:id
async function actualizar(req, res, next) {
  try {
    const { nombre, activo } = req.body;
    const chofer = await prisma.chofer.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(activo !== undefined && { activo }),
      },
    });
    res.json({ ok: true, data: chofer });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/choferes/:id
async function eliminar(req, res, next) {
  try {
    await prisma.chofer.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true, mensaje: 'Chofer eliminado' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
