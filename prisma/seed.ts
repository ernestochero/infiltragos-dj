import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.request.createMany({
    data: [
      { songTitle: 'Song A', artist: 'Artist 1' },
      { songTitle: 'Song B', artist: 'Artist 2' },
      { songTitle: 'Song C', artist: 'Artist 3' },
      { songTitle: 'Song D', artist: 'Artist 4' },
      { songTitle: 'Song E', artist: 'Artist 5' },
    ],
  });
}

main().catch(e => console.error(e)).finally(async () => { await prisma.$disconnect(); });
