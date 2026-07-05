const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { firmarToken } = require('../utils/jwt');
const { enviarEmailRecuperacion } = require('../utils/email');

const ROLES_VALIDOS = ['ADMIN', 'CHOFER'];
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

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

// POST /api/auth/registro  (público - autorregistro como CHOFER)
// Body: nombre, email, password
// Vincula (o crea) el Chofer por nombre, igual que hace /api/registros al vuelo,
// así si ya tenía movimientos cargados con ese nombre, la cuenta queda unida a su historial.
async function registroPublico(req, res, next) {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ ok: false, mensaje: 'El nombre es obligatorio' });
    }
    if (!email || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Email y password son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, mensaje: 'La password debe tener al menos 6 caracteres' });
    }

    const chofer = await prisma.chofer.upsert({
      where: { nombre: nombre.trim() },
      update: {},
      create: { nombre: nombre.trim() },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        email: email.trim().toLowerCase(),
        password: passwordHash,
        rol: 'CHOFER',
        choferId: chofer.id,
      },
      include: { chofer: true },
    });

    const token = firmarToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      choferId: usuario.choferId,
    });

    res.status(201).json({ ok: true, data: { token, usuario: usuarioPublico(usuario) } });
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

// PUT /api/auth/usuarios/:id/rol  (solo ADMIN)
// Body: { rol: "ADMIN" | "CHOFER" }
async function cambiarRol(req, res, next) {
  try {
    const id = Number(req.params.id);
    const rolFinal = (req.body.rol || '').toUpperCase();

    if (!ROLES_VALIDOS.includes(rolFinal)) {
      return res.status(400).json({ ok: false, mensaje: `El rol debe ser uno de: ${ROLES_VALIDOS.join(', ')}` });
    }
    if (id === req.usuario.id) {
      return res.status(400).json({ ok: false, mensaje: 'No podés cambiar tu propio rol' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });

    if (rolFinal === 'CHOFER' && !usuario.choferId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Este usuario no está vinculado a ningún chofer, no se puede pasar a rol Chofer',
      });
    }

    const actualizado = await prisma.usuario.update({
      where: { id },
      data: { rol: rolFinal },
      include: { chofer: true },
    });

    res.json({ ok: true, data: usuarioPublico(actualizado) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/auth/usuarios/:id  (solo ADMIN)
async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (id === req.usuario.id) {
      return res.status(400).json({ ok: false, mensaje: 'No podés eliminar tu propia cuenta' });
    }

    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true, mensaje: 'Usuario eliminado' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password  (público)
// Body: { email }
async function olvidoPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ ok: false, mensaje: 'El email es obligatorio' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });

    // Mensaje genérico siempre: así este endpoint no sirve para averiguar qué emails existen
    const mensaje = 'Si el email existe en el sistema, te enviamos un link para recuperar tu contraseña';

    if (!usuario || !usuario.activo) {
      return res.json({ ok: true, mensaje });
    }

    const tokenCrudo = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenCrudo).digest('hex');

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    // No se espera el envío del email: el SMTP de Gmail puede tardar varios
    // segundos y sumado al "despertar" del server en el plan gratuito de Render
    // termina superando el timeout del frontend. El token ya quedó guardado,
    // así que la respuesta puede volver de inmediato.
    enviarEmailRecuperacion(usuario.email, tokenCrudo).catch((err) => {
      console.error('Error enviando email de recuperación:', err);
    });

    res.json({ ok: true, mensaje });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password  (público)
// Body: { token, password }
async function restablecerPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Token y password son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, mensaje: 'La password debe tener al menos 6 caracteres' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const usuario = await prisma.usuario.findFirst({
      where: { resetToken: tokenHash, resetTokenExpires: { gt: new Date() } },
    });

    if (!usuario) {
      return res.status(400).json({ ok: false, mensaje: 'El link de recuperación es inválido o expiró' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { password: passwordHash, resetToken: null, resetTokenExpires: null },
    });

    res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  perfil,
  registrar,
  listar,
  registroPublico,
  cambiarRol,
  eliminar,
  olvidoPassword,
  restablecerPassword,
};
