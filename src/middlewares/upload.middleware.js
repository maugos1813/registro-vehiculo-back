const multer = require('multer');

// Guardamos los archivos en memoria (buffer) y luego los subimos nosotros mismos
// a Cloudinary (ver src/utils/subirFoto.js). Así evitamos depender de librerías
// de terceros con conflictos de versión frente a cloudinary v2.
const storage = multer.memoryStorage();

const TIPOS_PERMITIDOS = /image\/(jpeg|jpg|png|webp|heic|heif)/;

function filtroArchivos(req, file, cb) {
  if (TIPOS_PERMITIDOS.test(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Solo se permiten imágenes (jpg, jpeg, png, webp, heic)'));
}

const upload = multer({
  storage,
  fileFilter: filtroArchivos,
  limits: { fileSize: 8 * 1024 * 1024, files: 6 }, // 8MB por foto, hasta 6 fotos
});

// Middleware listo para usar en las rutas: espera el campo "fotos"
module.exports = upload.array('fotos', 6);
