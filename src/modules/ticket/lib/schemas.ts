import { z } from 'zod';

const optionalString = z.string().trim().optional().transform((val) => (val ? val : undefined));

export const eventCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  summary: optionalString,
  description: optionalString,
  startsAt: optionalString,
  endsAt: optionalString,
  venue: optionalString,
  address: optionalString,
  city: optionalString,
  country: optionalString,
  bannerUrl: optionalString,
  bannerKey: optionalString,
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export const eventUpdateSchema = eventCreateSchema.partial();

export const ticketTypeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: optionalString,
  price: z.number().min(0),
  currency: z.string().trim().min(1).max(8).default('PEN'),
  totalQuantity: z.number().int().positive(),
  perOrderLimit: z.number().int().positive().optional(),
  saleStartsAt: optionalString,
  saleEndsAt: optionalString,
  validFrom: optionalString,
  validUntil: optionalString,
  status: z.enum(['DRAFT', 'ON_SALE', 'ARCHIVED']).optional(),
});

export const issueTicketsSchema = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1).optional(),
  recipientName: z.string().trim().min(2).max(120),
  recipientEmail: z.string().trim().email(),
  recipientPhone: optionalString,
  quantity: z.number().int().min(1).max(20),
  note: optionalString,
  sendEmail: z.boolean().optional(),
});

export const scanTicketSchema = z.object({
  code: z.string().trim().min(6),
  device: optionalString,
  location: optionalString,
  eventId: optionalString,
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;
export type IssueTicketsInput = z.infer<typeof issueTicketsSchema>;
export type ScanTicketInput = z.infer<typeof scanTicketSchema>;
