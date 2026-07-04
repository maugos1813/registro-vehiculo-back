const cloudinary = require('../config/cloudinary');

// Sube un buffer de imagen (que viene de multer.memoryStorage) directo a Cloudinary,
// sin pasar por el disco del servidor. Devuelve { url, publicId }.
function subirFotoCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'registro-vehiculos',
        transformation: [{ width: 1600, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

// Sube varias fotos en paralelo
function subirFotosCloudinary(archivos = []) {
  return Promise.all(archivos.map((archivo) => subirFotoCloudinary(archivo.buffer)));
}

module.exports = { subirFotoCloudinary, subirFotosCloudinary };
