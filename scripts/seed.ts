import { PrismaClient, RequestStatus, UserRole, SurveyStatus } from '@prisma/client';

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

  await prisma.survey.create({
    data: {
      name: 'Encuesta de Prueba',
      slug: 'encuesta-prueba',
      status: SurveyStatus.PUBLISHED,
      questions: {
        create: [
          { type: 'SHORT_TEXT', label: 'Nombre', order: 0, required: true },
          { type: 'EMAIL', label: 'Email', order: 1, required: false },
          { type: 'LONG_TEXT', label: 'Comentario', order: 2, required: false },
          {
            type: 'SINGLE_CHOICE',
            label: 'Satisfacción',
            order: 3,
            required: true,
            options: ['Bueno', 'Regular', 'Malo'],
          },
          {
            type: 'MULTIPLE_CHOICE',
            label: 'Bebidas favoritas',
            order: 4,
            required: false,
            options: ['Cerveza', 'Vino', 'Otro'],
          },
        ],
      },
    },
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
