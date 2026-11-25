import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ticketSchema, type Ticket, type TriageResponse } from '../contracts';
import { ErrorDto, TicketDto, TriageResponseDto } from './triage.dto';
import { TriageService } from './triage.service';
import { ZodValidationPipe } from './zod-validation.pipe';

@ApiTags('triage')
@Controller('triage')
export class TriageController {
  constructor(private readonly service: TriageService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Classify a support ticket and draft a reply' })
  @ApiBody({ type: TicketDto })
  @ApiOkResponse({ type: TriageResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid ticket', type: ErrorDto })
  @ApiBadGatewayResponse({
    description: 'The model failed or returned invalid output',
    type: ErrorDto,
  })
  triage(@Body(new ZodValidationPipe(ticketSchema)) ticket: Ticket): Promise<TriageResponse> {
    return this.service.triage(ticket);
  }
}
