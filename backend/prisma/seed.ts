import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  console.log(`Bouturage de la base de données en cours...`);
  
  // Create first user (candidat)
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

  // ==================== BUSINESS PARTNER SEED ====================

  const hashedPw = await bcrypt.hash('business123', 10);

  const businessPartner = await prisma.user.upsert({
    where: { email: 'partenaire@missionlocale.fr' },
    update: {},
    create: {
      email: 'partenaire@missionlocale.fr',
      name: 'Mission Locale de Paris',
      password: hashedPw,
      role: 'BUSINESS_PARTNER',
      plan: 'Pro',
      city: 'Paris, France',
      phone: '+33 1 44 55 66 77',
      skills: [],
    },
  });

  console.log(`✅ Business Partner seedé : ${businessPartner.name}`);

  // Create demo jobseekers
  const jobseeker1 = await prisma.user.upsert({
    where: { email: 'marie.dupont@email.fr' },
    update: {},
    create: {
      email: 'marie.dupont@email.fr',
      name: 'Marie Dupont',
      password: hashedPw,
      title: 'Assistante administrative',
      city: 'Paris 15e',
      phone: '+33 6 11 22 33 44',
      skills: ['Word', 'Excel', 'Gestion administrative', 'Accueil'],
      languages: ['Français', 'Anglais'],
      summary: 'Recherche un poste d\'assistante administrative dans le secteur tertiaire.',
    },
  });

  const jobseeker2 = await prisma.user.upsert({
    where: { email: 'karim.benzema@email.fr' },
    update: {},
    create: {
      email: 'karim.benzema@email.fr',
      name: 'Karim Ben Ahmed',
      password: hashedPw,
      title: 'Technicien de maintenance',
      city: 'Montreuil',
      phone: '+33 6 55 66 77 88',
      skills: ['Électricité', 'Plomberie', 'CACES', 'Habilitation électrique'],
      languages: ['Français', 'Arabe'],
      summary: 'Technicien polyvalent avec 3 ans d\'expérience en maintenance industrielle.',
    },
  });

  const jobseeker3 = await prisma.user.upsert({
    where: { email: 'sophie.martin@email.fr' },
    update: {},
    create: {
      email: 'sophie.martin@email.fr',
      name: 'Sophie Martin',
      password: hashedPw,
      title: 'Vendeuse en prêt-à-porter',
      city: 'Paris 11e',
      skills: ['Vente', 'Conseil client', 'Merchandising', 'Caisse'],
      languages: ['Français'],
      summary: 'Passionnée de mode, je cherche un poste en boutique.',
    },
  });

  console.log(`✅ 3 demandeurs d'emploi seedés`);

  // Create affiliations
  const affiliationsData = [
    { businessId: businessPartner.id, jobseekerId: user.id, status: 'active' },
    { businessId: businessPartner.id, jobseekerId: jobseeker1.id, status: 'active' },
    { businessId: businessPartner.id, jobseekerId: jobseeker2.id, status: 'active' },
    { businessId: businessPartner.id, jobseekerId: jobseeker3.id, status: 'inactive' },
  ];

  for (const aff of affiliationsData) {
    await prisma.businessAffiliation.upsert({
      where: { businessId_jobseekerId: { businessId: aff.businessId, jobseekerId: aff.jobseekerId } },
      update: {},
      create: aff,
    });
  }

  console.log(`✅ 4 affiliations créées`);

  // Create business offers
  await prisma.businessOffer.createMany({
    data: [
      {
        businessId: businessPartner.id,
        title: 'Assistant(e) administratif(ve) - CDI',
        description: 'Nous recherchons un(e) assistant(e) administratif(ve) pour rejoindre notre équipe. Vous serez en charge de l\'accueil, de la gestion du courrier et du suivi administratif des dossiers.',
        contractType: 'CDI',
        location: 'Paris 15e',
        salaryRange: '24-28K€',
        requiredSkills: ['Word', 'Excel', 'Gestion administrative', 'Accueil'],
        isPublished: true,
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 jours
      },
      {
        businessId: businessPartner.id,
        title: 'Technicien de maintenance - CDD 6 mois',
        description: 'Mission de 6 mois pour un technicien de maintenance dans un immeuble de bureaux. Vous interviendrez sur les installations électriques, la plomberie et la climatisation.',
        contractType: 'CDD',
        location: 'La Défense',
        salaryRange: '26-30K€',
        requiredSkills: ['Électricité', 'Plomberie', 'Habilitation électrique'],
        isPublished: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ 2 offres business créées`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

