const { Router } = require('express');
const controller = require('../controllers/registro.controller');
const uploadFotos = require('../middlewares/upload.middleware');
const { requiereAuth } = require('../middlewares/auth.middleware');

const router = Router();

router.use(requiereAuth);

router.get('/', controller.listar);
router.get('/ultimo/:vehiculoId', controller.ultimoEstadoVehiculo);
router.get('/ultimo-chofer/:choferId', controller.ultimoEstadoChofer);
router.get('/:id', controller.obtener);
router.post('/', uploadFotos, controller.crear);
router.put('/:id', uploadFotos, controller.actualizar);
router.delete('/:id', controller.eliminar);

module.exports = router;
