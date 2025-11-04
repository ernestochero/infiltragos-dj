import { PrismaClient, UserRole } from '@prisma/client';

// Helper to ensure user by name (does not require unique constraint on name)
async function ensureUserByName(name: string, role: UserRole) {
  const existing = await prisma.user.findFirst({ where: { name } });
  if (existing) {
    if (existing.role !== role) {
      await prisma.user.update({ where: { id: existing.id }, data: { role } });
    }
    return existing;
  }
  return prisma.user.create({ data: { name, role } });
}

const prisma = new PrismaClient();

async function main() {
  const djUser = process.env.DJ_ADMIN_USER || 'dj@example.com';
  const adminUser = process.env.ADMIN_USER || 'admin@example.com';

  await ensureUserByName(djUser, UserRole.DJ);
  await ensureUserByName(adminUser, UserRole.ADMIN);
  
}
main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
