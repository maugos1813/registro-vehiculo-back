-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'CHOFER');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'CHOFER',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "choferId" INTEGER,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_choferId_key" ON "usuarios"("choferId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_choferId_fkey" FOREIGN KEY ("choferId") REFERENCES "choferes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
