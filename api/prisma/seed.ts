import { PrismaClient, AuthMode, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create or update global config
  const globalConfig = await prisma.globalConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      appTitle: 'My Dashboard',
      authMode: AuthMode.NONE,
      allowPublicRegistration: false,
      iconSourceUrl: 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/',
      themeSettings: {
        mode: 'dark',
        primaryColor: '#6366f1',
        customCss: '',
      },
    },
  });
  console.log('✅ Global config created');

  // Create default admin user (password: admin)
  const adminPassword = await argon2.hash('admin');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@localhost' },
    update: {},
    create: {
      email: 'admin@localhost',
      username: 'admin',
      passwordHash: adminPassword,
      displayName: 'Administrator',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log('✅ Admin user created (admin@localhost / admin)');

  // Create default categories
  const categories = [
    { name: 'Media', icon: '🎬', sortOrder: 1 },
    { name: 'Infrastructure', icon: '🔧', sortOrder: 2 },
    { name: 'Monitoring', icon: '📊', sortOrder: 3 },
    { name: 'Development', icon: '💻', sortOrder: 4 },
    { name: 'Other', icon: '📁', sortOrder: 99 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Default categories created');

  // Create example services
  const exampleServices = [
    {
      name: 'Portainer',
      description: 'Docker container management',
      url: 'http://localhost:9000',
      iconSlug: 'portainer',
      category: 'Infrastructure',
      isPublic: false,
      sortOrder: 1,
    },
    {
      name: 'Grafana',
      description: 'Metrics visualization',
      url: 'http://localhost:3000',
      iconSlug: 'grafana',
      category: 'Monitoring',
      isPublic: false,
      sortOrder: 2,
    },
  ];

  for (const service of exampleServices) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    if (!existing) {
      await prisma.service.create({ data: service });
    }
  }
  console.log('✅ Example services created');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
