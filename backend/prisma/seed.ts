import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log(`Bouturage de la base de données en cours...`);
  
  // Create first user
  const user = await prisma.user.upsert({
    where: { email: 'contact@joboost.ai' },
    update: {},
    create: {
      email: 'contact@joboost.ai',
      name: 'Candidat Pro',
      plan: 'FREE',
      applicationsCount: 40,
      quota: 100,
      phone: '+33 6 12 34 56 78',
      city: 'Paris, France',
      skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
      languages: ['Français', 'Anglais'],
      hobbies: ['IA', 'Open source'],
      experiences: [
        {
          id: 'exp_1',
          company: 'Acme Corp',
          role: 'Développeur Fullstack',
          period: '2021 - 2024',
          desc: 'Création d\'interfaces dynamiques et serveurs évolutifs.'
        }
      ]
    },
  });

  console.log(`✅ Utilisateur initial seedé : ${user.name} (${user.email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
