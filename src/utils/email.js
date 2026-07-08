const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// tokenCrudo: token sin hashear (el hash es lo único que se guarda en la base)
async function enviarEmailRecuperacion(destinatario, tokenCrudo) {
  const link = `${process.env.FRONTEND_URL}?token=${tokenCrudo}`;

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: destinatario,
    subject: 'Recuperar tu contraseña',
    html: `
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p><a href="${link}">Hacé click acá para elegir una nueva contraseña</a></p>
      <p>Este link expira en 1 hora. Si no fuiste vos quien lo pidió, podés ignorar este email.</p>
    `,
  });

  if (error) {
    throw new Error(error.message || 'Error enviando el email de recuperación');
  }
}

module.exports = { enviarEmailRecuperacion };
