const { Router } = require('express');

const authRoutes = require('./auth.routes');
const registroRoutes = require('./registro.routes');
const choferRoutes = require('./chofer.routes');
const vehiculoRoutes = require('./vehiculo.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/registros', registroRoutes);
router.use('/choferes', choferRoutes);
router.use('/vehiculos', vehiculoRoutes);

module.exports = router;
