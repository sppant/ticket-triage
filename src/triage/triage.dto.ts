import { ApiProperty } from '@nestjs/swagger';
import { CATEGORIES, PRIORITIES, type ProviderId, type TriageResponse } from '../contracts';

/** Documentation-only DTOs; validation lives in the Zod schemas of contracts.ts. */
export class TicketDto {
  @ApiProperty({ minLength: 1, maxLength: 200, example: 'Charged twice this month' })
  subject!: string;

  @ApiProperty({ minLength: 1, maxLength: 5000, example: 'I see two charges on my invoice.' })
  body!: string;
}

export class TriageResponseDto implements TriageResponse {
  @ApiProperty({ enum: CATEGORIES })
  category!: TriageResponse['category'];

  @ApiProperty({ enum: PRIORITIES })
  priority!: TriageResponse['priority'];

  @ApiProperty({ description: 'Suggested reply to the customer' })
  draft_reply!: string;

  @ApiProperty({ description: 'Identifier of the model that answered' })
  model!: string;

  @ApiProperty({ minimum: 0, description: 'Time spent in the model call(s), in milliseconds' })
  latency_ms!: number;

  @ApiProperty({ enum: ['ollama', 'anthropic', 'fake'] })
  provider!: ProviderId;

  @ApiProperty({ description: 'Why this provider was chosen' })
  route_reason!: string;

  @ApiProperty({
    type: [String],
    description: 'Titles of the help-center articles given to the model, best first (at most 3)',
  })
  sources!: string[];

  @ApiProperty({
    enum: ['embedding', 'keyword'],
    description: 'How the articles were found: embedding similarity or keyword fallback',
  })
  retrieval!: 'embedding' | 'keyword';
}

export class ErrorDto {
  @ApiProperty()
  message!: string;
}
