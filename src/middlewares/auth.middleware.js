const { verificarToken } = require('../utils/jwt');

// Exige un JWT válido en el header "Authorization: Bearer <token>"
// y cuelga los datos del usuario autenticado en req.usuario
function requiereAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, mensaje: 'Token no provisto' });
  }

  try {
    const payload = verificarToken(token);
    req.usuario = payload; // { id, email, rol, choferId }
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado' });
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
