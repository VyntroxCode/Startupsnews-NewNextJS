import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { PartnershipEventsService } from '@/modules/partnership-events/service/partnership-events.service';
import { PartnershipEventsRepository } from '@/modules/partnership-events/repository/partnership-events.repository';
import { EventSubmissionService } from '@/modules/event-submission/service/event-submission.service';
import { SubmitEventPayload, SubmitEventValidationError } from '@/modules/event-submission/domain/types';
import { EventsService } from '@/modules/events/service/events.service';
import { EventsRepository } from '@/modules/events/repository/events.repository';

export const runtime = 'nodejs';

const eventSubmissionService = new EventSubmissionService(
  new PartnershipEventsService(new PartnershipEventsRepository(), new EventsService(new EventsRepository()))
);

export async function POST(request: NextRequest) {
  const [body, bodyError] = await parseJsonBody<SubmitEventPayload>(request);
  if (bodyError) return bodyError;
  if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

  try {
    const result = await eventSubmissionService.submit(body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const status = error instanceof SubmitEventValidationError ? 400 : 500;
    if (status === 500) console.error('Error creating public event submission:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit event' },
      { status }
    );
  }
}
