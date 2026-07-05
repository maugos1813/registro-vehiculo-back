const dns = require('dns');
const nodemailer = require('nodemailer');

// Algunos hosts en la nube (ej. Render) reportan una interfaz IPv6 que en
// realidad no tiene salida a internet. Nodemailer resuelve A y AAAA y elige
// una al azar, así que puede terminar intentando conectar por esa IPv6
// inexistente y tirar ENETUNREACH. Forzamos que solo resuelva IPv4.
if (dns.Resolver) {
  dns.Resolver.prototype.resolve6 = (hostname, callback) => callback(null, []);
}
dns.resolve6 = (hostname, callback) => callback(null, []);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// tokenCrudo: token sin hashear (el hash es lo único que se guarda en la base)
async function enviarEmailRecuperacion(destinatario, tokenCrudo) {
  const link = `${process.env.FRONTEND_URL}?token=${tokenCrudo}`;

  await transporter.sendMail({
    from: `"Registro de Vehículos" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: 'Recuperar tu contraseña',
    html: `
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p><a href="${link}">Hacé click acá para elegir una nueva contraseña</a></p>
      <p>Este link expira en 1 hora. Si no fuiste vos quien lo pidió, podés ignorar este email.</p>
    `,
  });
}

module.exports = { enviarEmailRecuperacion };
