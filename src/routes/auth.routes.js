const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const { requiereAuth, soloAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.post('/login', controller.login);
router.post('/registro', controller.registroPublico);
router.get('/me', requiereAuth, controller.perfil);
router.get('/usuarios', requiereAuth, soloAdmin, controller.listar);
router.post('/registrar', requiereAuth, soloAdmin, controller.registrar);

module.exports = router;
