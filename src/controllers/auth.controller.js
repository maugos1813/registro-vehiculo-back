const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { firmarToken } = require('../utils/jwt');

const ROLES_VALIDOS = ['ADMIN', 'CHOFER'];

function usuarioPublico(usuario) {
  const { password, ...resto } = usuario;
  return resto;
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Email y password son obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { chofer: true },
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales inválidas' });
    }

    const token = firmarToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      choferId: usuario.choferId,
    });

    res.json({ ok: true, data: { token, usuario: usuarioPublico(usuario) } });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/usuarios  (solo ADMIN)
async function listar(req, res, next) {
  try {
    const usuarios = await prisma.usuario.findMany({
      include: { chofer: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ ok: true, data: usuarios.map(usuarioPublico) });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function perfil(req, res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: { chofer: true },
    });
    if (!usuario) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    res.json({ ok: true, data: usuarioPublico(usuario) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/registrar  (solo ADMIN)
// Body: email, password, rol ("ADMIN" | "CHOFER"), choferId (obligatorio si rol = CHOFER)
async function registrar(req, res, next) {
  try {
    const { email, password, rol, choferId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Email y password son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, mensaje: 'La password debe tener al menos 6 caracteres' });
    }

    const rolFinal = (rol || 'CHOFER').toUpperCase();
    if (!ROLES_VALIDOS.includes(rolFinal)) {
      return res.status(400).json({ ok: false, mensaje: `El rol debe ser uno de: ${ROLES_VALIDOS.join(', ')}` });
    }

    if (rolFinal === 'CHOFER' && !choferId) {
      return res.status(400).json({ ok: false, mensaje: 'choferId es obligatorio para usuarios con rol CHOFER' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        email: email.trim().toLowerCase(),
        password: passwordHash,
        rol: rolFinal,
        choferId: rolFinal === 'CHOFER' ? Number(choferId) : null,
      },
      include: { chofer: true },
    });

    res.status(201).json({ ok: true, data: usuarioPublico(usuario) });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, perfil, registrar, listar };
