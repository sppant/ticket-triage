import { z } from 'zod';
import { CATEGORIES, PRIORITIES } from '../src/contracts';

/** A labeled ticket from the dataset. */
export const datasetTicketSchema = z.object({
  id: z.union([z.string(), z.number()]),
  subject: z.string(),
  body: z.string(),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
});
export type DatasetTicket = z.infer<typeof datasetTicketSchema>;
