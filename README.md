# API - Registro de Toma/Entrega de Vehículos (Gamonaltrasporti)

API REST en **Node.js + Express**, arquitectura **MVC**, con **Prisma ORM**, pensada para que cada chofer registre en segundos cuándo toma o deja un vehículo, con fecha/hora automática, comentarios y fotos de evidencia.

**Todo vive en la nube:**
- Base de datos → PostgreSQL alojado (recomendado: **Neon**, gratis)
- Fotos de evidencia → **Cloudinary** (gratis), nunca se guardan en el disco del servidor
- El servidor Express en sí también debe desplegarse en la nube (recomendado: **Render** o **Railway**), para que los choferes lo usen desde el celular sin depender de tu computadora encendida

## 📁 Estructura (MVC)

```
registro-vehiculos/
├── prisma/
│   └── schema.prisma          # Modelos: Registro, Chofer, Vehiculo
├── src/
│   ├── config/
│   │   ├── prisma.js          # Cliente Prisma (DB en la nube)
│   │   └── cloudinary.js      # Cliente Cloudinary (fotos en la nube)
│   ├── controllers/           # Lógica de negocio
│   │   ├── registro.controller.js
│   │   ├── chofer.controller.js
│   │   └── vehiculo.controller.js
│   ├── middlewares/
│   │   ├── upload.middleware.js   # Multer (memoria) -> valida y limita las fotos
│   │   └── error.middleware.js
│   ├── utils/
│   │   └── subirFoto.js       # Sube los buffers de las fotos a Cloudinary
│   ├── routes/
│   │   ├── index.js
│   │   ├── registro.routes.js
│   │   ├── chofer.routes.js
│   │   └── vehiculo.routes.js
│   ├── app.js
│   └── server.js
├── .env.example
└── package.json
```

## 🚀 Paso 1: Base de datos en la nube (Neon)

1. Crea una cuenta gratis en https://neon.tech
2. Crea un proyecto → copia el "Connection string" (algo como `postgresql://usuario:password@ep-xxxx.neon.tech/dbname?sslmode=require`)
3. Pégalo en tu `.env` como `DATABASE_URL`

> Alternativas equivalentes: Supabase, Railway Postgres, Aiven.

## 🚀 Paso 2: Fotos en la nube (Cloudinary)

1. Crea una cuenta gratis en https://cloudinary.com
2. En el Dashboard copia: `Cloud name`, `API Key`, `API Secret`
3. Pégalos en tu `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```

Con esto, cada foto que suba un chofer va directo del celular a Cloudinary (el servidor solo pasa el archivo, no lo guarda). Las URLs quedan guardadas en la base de datos junto al registro.

## 🚀 Paso 3: instalar y correr localmente (para probar)

```bash
cd registro-vehiculos
npm install
cp .env.example .env
# completa DATABASE_URL y las 3 variables de Cloudinary

npx prisma migrate dev --name init   # crea las tablas en tu Postgres de Neon
npm run dev                          # http://localhost:3000
```

Aunque corras el servidor en tu computadora, los datos (DB y fotos) ya quedan en la nube — si apagas tu compu, la información sigue intacta.

## 🚀 Paso 4: desplegar el servidor en la nube (para que los choferes lo usen desde el celular)

Recomendado: **Render** (tiene plan gratuito/económico y es muy simple con Node + Prisma).

1. Sube este proyecto a un repo de GitHub.
2. En Render: "New Web Service" → conecta el repo.
3. Build command: `npm install && npx prisma generate`
4. Start command: `npx prisma migrate deploy && npm start`
5. Agrega las variables de entorno (`DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `PORT`) en la configuración del servicio.
6. Al desplegar obtienes una URL pública (ej. `https://registro-vehiculos.onrender.com`) — esa es la que usa la app/frontend de los choferes.

> Alternativas equivalentes: Railway, Fly.io.

## 🗄️ Modelo de datos

**Registro** (un registro por cada toma/entrega):
| Campo        | Tipo                    | Notas                                   |
|--------------|-------------------------|------------------------------------------|
| id           | Int                     | autoincrement                           |
| fechaHora    | DateTime                | **automático**, `default(now())`        |
| tipo         | `TOMA` \| `DEJA`        | enum, obligatorio                       |
| choferId     | Int (FK -> Chofer)      |                                          |
| vehiculoId   | Int (FK -> Vehiculo)    |                                          |
| comentarios  | String?                 | opcional                                |
| fotos        | Json                    | array de `{ url, publicId }` (Cloudinary) |

**Chofer** y **Vehiculo** son catálogos simples (nombre / targa) que alimentan las listas desplegables. Si el chofer o la targa no existen aún, el endpoint de creación de `Registro` los crea automáticamente — así el chofer no pierde tiempo dando de alta nada antes de registrar.

## 📡 Endpoints principales

### Registros (el flujo rápido de la app)
| Método | Ruta                              | Descripción |
|--------|-------------------------------------|-------------|
| GET    | `/api/registros`                   | Lista con filtros `choferId, vehiculoId, tipo, desde, hasta, page, limit` |
| GET    | `/api/registros/:id`               | Detalle de un registro |
| GET    | `/api/registros/ultimo/:vehiculoId`| Último movimiento de un vehículo (saber si está tomado o libre) |
| POST   | `/api/registros`                   | Crea un registro (multipart/form-data) |
| PUT    | `/api/registros/:id`               | Edita comentarios/tipo, agrega más fotos |
| DELETE | `/api/registros/:id`               | Elimina el registro y sus fotos en Cloudinary |

**Crear un registro** (POST `/api/registros`, `multipart/form-data`):

| Campo           | Obligatorio | Descripción                                  |
|-----------------|-------------|-----------------------------------------------|
| tipo            | Sí          | `"TOMA"` o `"DEJA"` (lista de 2 opciones)     |
| choferNombre    | Sí (o choferId) | Nombre del chofer (texto libre, autocompleta)|
| targaVehiculo   | Sí (o vehiculoId) | Targa del vehículo                        |
| comentarios     | No          | Texto libre                                   |
| fotos           | No          | Hasta 6 imágenes (jpg/png/webp/heic, 8MB c/u) |

`fechaHora` **no se envía**: la pone el servidor automáticamente al instante de la petición.

Ejemplo con `curl` (contra el servidor ya desplegado):
```bash
curl -X POST https://registro-vehiculos.onrender.com/api/registros \
  -F "tipo=TOMA" \
  -F "choferNombre=Mario Rossi" \
  -F "targaVehiculo=AB123CD" \
  -F "comentarios=Sin daños visibles" \
  -F "fotos=@/ruta/foto1.jpg" \
  -F "fotos=@/ruta/foto2.jpg"
```

Respuesta:
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "fechaHora": "2026-07-04T10:32:00.000Z",
    "tipo": "TOMA",
    "comentarios": "Sin daños visibles",
    "fotos": [
      { "url": "https://res.cloudinary.com/.../foto1.jpg", "publicId": "registro-vehiculos/173..-foto1" }
    ],
    "chofer": { "id": 1, "nombre": "Mario Rossi" },
    "vehiculo": { "id": 1, "targa": "AB123CD" }
  }
}
```

### Choferes (catálogo para el dropdown)
`GET /api/choferes` · `GET /api/choferes/:id` · `POST /api/choferes` · `PUT /api/choferes/:id` · `DELETE /api/choferes/:id`

### Vehículos (catálogo para el dropdown)
`GET /api/vehiculos` · `GET /api/vehiculos/:id` · `POST /api/vehiculos` · `PUT /api/vehiculos/:id` · `DELETE /api/vehiculos/:id`

## 🔒 Notas de producción
- Agregar autenticación (JWT) antes de exponer esto públicamente — esta versión no incluye login. Avísame si quieres que lo agregue.
- Plan gratuito de Neon/Render puede tener "sleep" tras inactividad (la primera petición tarda unos segundos en despertar) — normal en free tier, sube de plan si esto molesta en uso diario.
- Cloudinary free tier: 25 créditos/mes (~25GB de almacenamiento+ancho de banda), suficiente para uso moderado; monitorea el uso si son muchos choferes subiendo fotos a diario.
