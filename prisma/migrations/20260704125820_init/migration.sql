-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('TOMA', 'DEJA');

-- CreateTable
CREATE TABLE "choferes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "choferes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehiculos" (
    "id" SERIAL NOT NULL,
    "targa" TEXT NOT NULL,
    "modelo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros" (
    "id" SERIAL NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoMovimiento" NOT NULL,
    "comentarios" TEXT,
    "fotos" JSONB NOT NULL DEFAULT '[]',
    "choferId" INTEGER NOT NULL,
    "vehiculoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "choferes_nombre_key" ON "choferes"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "vehiculos_targa_key" ON "vehiculos"("targa");

-- CreateIndex
CREATE INDEX "registros_choferId_idx" ON "registros"("choferId");

-- CreateIndex
CREATE INDEX "registros_vehiculoId_idx" ON "registros"("vehiculoId");

-- CreateIndex
CREATE INDEX "registros_fechaHora_idx" ON "registros"("fechaHora");

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_choferId_fkey" FOREIGN KEY ("choferId") REFERENCES "choferes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "vehiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
