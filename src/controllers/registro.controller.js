const prisma = require('../config/prisma');
const cloudinary = require('../config/cloudinary');
const { subirFotosCloudinary } = require('../utils/subirFoto');

const TIPOS_VALIDOS = ['TOMA', 'DEJA'];

// GET /api/registros?choferId=&vehiculoId=&tipo=&desde=&hasta=&page=&limit=
async function listar(req, res, next) {
  try {
    const { choferId, vehiculoId, tipo, desde, hasta } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const where = {
      ...(choferId && { choferId: Number(choferId) }),
      ...(vehiculoId && { vehiculoId: Number(vehiculoId) }),
      ...(tipo && { tipo }),
      ...((desde || hasta) && {
        fechaHora: {
          ...(desde && { gte: new Date(desde) }),
          ...(hasta && { lte: new Date(hasta) }),
        },
      }),
    };

    const [registros, total] = await Promise.all([
      prisma.registro.findMany({
        where,
        include: { chofer: true, vehiculo: true },
        orderBy: { fechaHora: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.registro.count({ where }),
    ]);

    res.json({
      ok: true,
      data: registros,
      paginacion: { page, limit, total, totalPaginas: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/registros/:id
async function obtener(req, res, next) {
  try {
    const registro = await prisma.registro.findUnique({
      where: { id: Number(req.params.id) },
      include: { chofer: true, vehiculo: true },
    });
    if (!registro) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });
    res.json({ ok: true, data: registro });
  } catch (err) {
    next(err);
  }
}

// POST /api/registros
// Body (multipart/form-data): tipo, choferId, vehiculoId, comentarios, fotos[] (archivos)
// También acepta choferNombre / targaVehiculo como texto libre y los resuelve/crea automáticamente.
async function crear(req, res, next) {
  try {
    const { tipo, comentarios } = req.body;
    let { choferId, vehiculoId, choferNombre, targaVehiculo } = req.body;

    if (!tipo || !TIPOS_VALIDOS.includes(tipo.toUpperCase())) {
      return res.status(400).json({
        ok: false,
        mensaje: `El campo "tipo" es obligatorio y debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`,
      });
    }

    // Resolver chofer: por id, o por nombre (crea si no existe) para que la app sea "rápida"
    if (!choferId) {
      if (!choferNombre || !choferNombre.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'Debe indicar choferId o choferNombre' });
      }
      const chofer = await prisma.chofer.upsert({
        where: { nombre: choferNombre.trim() },
        update: {},
        create: { nombre: choferNombre.trim() },
      });
      choferId = chofer.id;
    }

    // Resolver vehículo: por id, o por targa (crea si no existe)
    if (!vehiculoId) {
      if (!targaVehiculo || !targaVehiculo.trim()) {
        return res.status(400).json({ ok: false, mensaje: 'Debe indicar vehiculoId o targaVehiculo' });
      }
      const targaNormalizada = targaVehiculo.trim().toUpperCase();
      const vehiculo = await prisma.vehiculo.upsert({
        where: { targa: targaNormalizada },
        update: {},
        create: { targa: targaNormalizada },
      });
      vehiculoId = vehiculo.id;
    }

    // req.files trae los buffers en memoria (multer.memoryStorage); los subimos ahora a Cloudinary
    const fotos = await subirFotosCloudinary(req.files);

    const registro = await prisma.registro.create({
      data: {
        tipo: tipo.toUpperCase(),
        comentarios: comentarios || null,
        fotos,
        choferId: Number(choferId),
        vehiculoId: Number(vehiculoId),
        // fechaHora usa el default(now()) de Prisma -> se registra el instante exacto
      },
      include: { chofer: true, vehiculo: true },
    });

    res.status(201).json({ ok: true, data: registro });
  } catch (err) {
    next(err);
  }
}

// PUT /api/registros/:id  (permite corregir comentarios/tipo; agrega fotos nuevas si se envían)
async function actualizar(req, res, next) {
  try {
    const { tipo, comentarios } = req.body;
    const id = Number(req.params.id);

    if (tipo && !TIPOS_VALIDOS.includes(tipo.toUpperCase())) {
      return res.status(400).json({
        ok: false,
        mensaje: `El campo "tipo" debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`,
      });
    }

    const registroActual = await prisma.registro.findUnique({ where: { id } });
    if (!registroActual) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });

    const fotosNuevas = await subirFotosCloudinary(req.files);

    const registro = await prisma.registro.update({
      where: { id },
      data: {
        ...(tipo && { tipo: tipo.toUpperCase() }),
        ...(comentarios !== undefined && { comentarios }),
        ...(fotosNuevas.length > 0 && { fotos: [...(registroActual.fotos || []), ...fotosNuevas] }),
      },
      include: { chofer: true, vehiculo: true },
    });

    res.json({ ok: true, data: registro });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/registros/:id
async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const registro = await prisma.registro.findUnique({ where: { id } });
    if (!registro) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });

    // Borra también las fotos en Cloudinary (nube) asociadas a este registro
    const fotos = registro.fotos || [];
    await Promise.all(
      fotos
        .filter((f) => f && f.publicId)
        .map((f) => cloudinary.uploader.destroy(f.publicId).catch(() => {}))
    );

    await prisma.registro.delete({ where: { id } });
    res.json({ ok: true, mensaje: 'Registro eliminado' });
  } catch (err) {
    next(err);
  }
}

// GET /api/registros/ultimo/:vehiculoId -> saber si el vehículo está "tomado" o "libre" ahora mismo
async function ultimoEstadoVehiculo(req, res, next) {
  try {
    const ultimo = await prisma.registro.findFirst({
      where: { vehiculoId: Number(req.params.vehiculoId) },
      orderBy: { fechaHora: 'desc' },
      include: { chofer: true, vehiculo: true },
    });
    if (!ultimo) {
      return res.json({ ok: true, data: null, mensaje: 'Sin movimientos registrados para este vehículo' });
    }
    res.json({ ok: true, data: ultimo });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, ultimoEstadoVehiculo };
