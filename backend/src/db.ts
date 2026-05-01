import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.POSTGRES_URI
        }
    }
});

export const checkDbConnection = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connecté à PostgreSQL avec succès via Prisma');
  } catch (err) {
    console.error('❌ Erreur de connexion à PostgreSQL :', err);
  }
};
