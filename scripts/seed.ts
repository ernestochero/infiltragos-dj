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

  const survey = await prisma.survey.create({
    data: {
      name: 'Satisfacción Infiltragos – v1',
      slug: 'satisfaccion-v1',
      status: SurveyStatus.PUBLISHED,
      questions: {
        create: [
          { id: 'q1', type: 'SHORT_TEXT', label: 'Nombre', order: 0, required: true },
          { id: 'q2', type: 'PHONE', label: 'Celular', order: 1, required: true },
          { id: 'q3', type: 'EMAIL', label: 'Email', order: 2 },
          { id: 'q4', type: 'DATE', label: 'Fecha de nacimiento', order: 3 },
          {
            id: 'q5',
            type: 'SINGLE_CHOICE',
            label: '¿Qué te gustaría ver en la carta?',
            order: 4,
            options: [
              { label: 'Más cocteles', value: 'cocteles', order: 0 },
              { label: 'Nuevas cervezas', value: 'cervezas', order: 1 },
              { label: 'Menú vegano', value: 'vegano', order: 2 },
              { label: 'Sin alcohol', value: 'sin_alcohol', order: 3 },
              { label: 'Otros', value: 'otros', order: 4 },
            ],
          },
          {
            id: 'q6',
            type: 'LONG_TEXT',
            label: '¿Qué temáticas te gustaría ver?',
            order: 5,
          },
          {
            id: 'q7',
            type: 'MULTIPLE_CHOICE',
            label: '¿Qué bandas te gustaría ver?',
            order: 6,
            options: [
              { label: 'Banda A', value: 'banda_a', order: 0 },
              { label: 'Banda B', value: 'banda_b', order: 1 },
              { label: 'Banda C', value: 'banda_c', order: 2 },
              { label: 'Banda D', value: 'banda_d', order: 3 },
              { label: 'Banda E', value: 'banda_e', order: 4 },
            ],
          },
        ],
      },
    },
    include: { questions: true },
  });

  await prisma.surveyResponse.createMany({
    data: [
      {
        surveyId: survey.id,
        answers: {
          q1: 'Juan',
          q2: '11111111',
          q3: 'juan@example.com',
          q4: '1990-01-01',
          q5: 'cocteles',
          q6: 'Más eventos temáticos',
          q7: ['banda_a', 'banda_c'],
        },
      },
      {
        surveyId: survey.id,
        answers: {
          q1: 'María',
          q2: '22222222',
          q3: 'maria@example.com',
          q4: '1985-05-12',
          q5: 'cervezas',
          q6: 'Noches de jazz',
          q7: ['banda_b'],
        },
      },
      {
        surveyId: survey.id,
        answers: {
          q1: 'Pedro',
          q2: '33333333',
          q5: 'vegano',
          q6: 'Eventos de trivia',
          q7: ['banda_d', 'banda_e'],
        },
      },
      {
        surveyId: survey.id,
        answers: {
          q1: 'Lucía',
          q2: '44444444',
          q3: 'lucia@example.com',
          q4: '1992-09-30',
          q5: 'sin_alcohol',
          q6: 'Más pop',
          q7: ['banda_a'],
        },
      },
      {
        surveyId: survey.id,
        answers: {
          q1: 'Carlos',
          q2: '55555555',
          q5: 'otros',
          q6: 'Sorpresas',
          q7: ['banda_c'],
        },
      },
    ],
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
