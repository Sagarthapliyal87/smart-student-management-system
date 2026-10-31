const { PrismaClient } = require('@prisma/client');
// One shared Prisma Client for the whole app (avoids exhausting DB connections).
module.exports = new PrismaClient();
