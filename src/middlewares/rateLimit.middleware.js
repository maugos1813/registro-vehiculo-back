const rateLimit = require('express-rate-limit');

function limiteExcedido(req, res) {
  res.status(429).json({ ok: false, mensaje: 'Demasiados intentos, esperá unos minutos y volvé a intentar' });
}

// Login: margen amplio para no trabar a un usuario que se equivoca de clave,
// pero suficiente para frenar fuerza bruta.
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiteExcedido,
});

// Forgot-password: acá el límite es más estricto porque cada intento manda
// un email real; sin esto, alguien podría spamear la casilla de otra persona.
const limiteOlvidoPassword = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiteExcedido,
});

const limiteResetPassword = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiteExcedido,
});

module.exports = { limiteLogin, limiteOlvidoPassword, limiteResetPassword };
