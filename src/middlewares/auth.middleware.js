const { verificarToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

// Exige un JWT válido en el header "Authorization: Bearer <token>"
// y cuelga los datos del usuario autenticado en req.usuario
async function requiereAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, mensaje: 'Token no provisto' });
  }

  let payload;
  try {
    payload = verificarToken(token);
  } catch (err) {
    return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado' });
  }

  try {
    // Se valida contra la base para poder cortar sesiones ya emitidas:
    // si el usuario se desactivó, o cambió su contraseña después de que
    // se firmó este token, el JWT deja de servir aunque no haya expirado.
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: { activo: true, passwordChangedAt: true },
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ ok: false, mensaje: 'Usuario inactivo o no encontrado' });
    }

    if (usuario.passwordChangedAt && payload.iat * 1000 < usuario.passwordChangedAt.getTime()) {
      return res.status(401).json({ ok: false, mensaje: 'La sesión expiró, iniciá sesión de nuevo' });
    }

    req.usuario = payload; // { id, email, rol, choferId }
    next();
  } catch (err) {
    next(err);
  }
}

// Exige que el usuario autenticado tenga rol ADMIN
function soloAdmin(req, res, next) {
  if (req.usuario?.rol !== 'ADMIN') {
    return res.status(403).json({ ok: false, mensaje: 'Acceso restringido a administradores' });
  }
  next();
}

module.exports = { requiereAuth, soloAdmin };
