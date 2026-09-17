import prismaPackage from "../generated/prisma/index.js";

const { PrismaClient } = prismaPackage;

const prisma = new PrismaClient();

export async function verifyDatabaseConnection() {
    await prisma.$queryRaw`SELECT 1`;
    return true;
}

export async function disconnectDatabase() {
    await prisma.$disconnect();
}

export default prisma;
