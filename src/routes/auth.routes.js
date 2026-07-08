const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const { requiereAuth, soloAdmin } = require('../middlewares/auth.middleware');
const { limiteLogin, limiteOlvidoPassword, limiteResetPassword } = require('../middlewares/rateLimit.middleware');

const router = Router();

router.post('/login', limiteLogin, controller.login);
router.post('/registro', controller.registroPublico);
router.post('/forgot-password', limiteOlvidoPassword, controller.olvidoPassword);
router.post('/reset-password', limiteResetPassword, controller.restablecerPassword);
router.get('/me', requiereAuth, controller.perfil);
router.get('/usuarios', requiereAuth, soloAdmin, controller.listar);
router.put('/usuarios/:id/rol', requiereAuth, soloAdmin, controller.cambiarRol);
router.delete('/usuarios/:id', requiereAuth, soloAdmin, controller.eliminar);
router.post('/registrar', requiereAuth, soloAdmin, controller.registrar);

module.exports = router;
