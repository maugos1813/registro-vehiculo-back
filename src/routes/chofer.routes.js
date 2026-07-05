const { Router } = require('express');
const controller = require('../controllers/chofer.controller');
const { requiereAuth, soloAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.use(requiereAuth);

router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.post('/', soloAdmin, controller.crear);
router.put('/:id', soloAdmin, controller.actualizar);
router.delete('/:id', soloAdmin, controller.eliminar);

module.exports = router;
