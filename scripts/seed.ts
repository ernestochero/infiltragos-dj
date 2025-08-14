import { PrismaClient, RequestStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      { name: 'DJ One', role: UserRole.DJ },
      { name: 'Admin', role: UserRole.ADMIN },
      { name: 'Patron 1', role: UserRole.PATRON },
      { name: 'Patron 2', role: UserRole.PATRON },
      { name: 'Patron 3', role: UserRole.PATRON },
    ],
  });

  await prisma.request.createMany({
    data: [
      { songTitle: 'Song A', artist: 'Artist 1', status: RequestStatus.PENDING, votes: 2 },
      { songTitle: 'Song B', artist: 'Artist 2', status: RequestStatus.PLAYING, votes: 5 },
      { songTitle: 'Song C', artist: 'Artist 3', status: RequestStatus.DONE, votes: 3 },
      { songTitle: 'Song D', artist: 'Artist 4', status: RequestStatus.REJECTED, votes: 1 },
      { songTitle: 'Song E', artist: 'Artist 5', status: RequestStatus.PENDING, votes: 0 },
    ],
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
