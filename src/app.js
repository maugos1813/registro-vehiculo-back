const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Render corre detrás de un proxy: sin esto, express-rate-limit (y req.ip en
// general) ve la IP del proxy en vez de la del cliente real.
app.set('trust proxy', 1);

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Nota: las fotos de evidencia ya NO se guardan en disco local, se suben
// directo a Cloudinary (ver src/middlewares/upload.middleware.js), así que
// no hace falta servir ninguna carpeta local de uploads.

app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'API de Registro de Toma/Entrega de Vehículos - Gamonaltrasporti' });
});

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
