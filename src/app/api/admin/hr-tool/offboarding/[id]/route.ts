import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import type { ClearanceInput, DecideInput, FnfInput } from '@/modules/hr-offboarding/service/hr-offboarding.service';
import { errorResponse, hrOffboardingService, resultResponse } from '../_lib';

interface RouteParams { params: Promise<{ id: string }>; }

interface CaseActionBody extends DecideInput, ClearanceInput, Omit<FnfInput, 'lines'> {
  lines?: unknown;
  letterType?: string;
  send?: boolean;
  personalEmail?: string;
  action?: string;
  handoverNotes?: string;
  rehireEligible?: boolean | null;
  toCredentialId?: number | null;
}

async function caseId(params: RouteParams['params']): Promise<number | null> {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** GET /api/admin/hr-tool/offboarding/[id] — the case window: case, clearance checklist, leads still
 * on the leaver, and who they can be handed to. */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;
  const id = await caseId(params);
  if (!id) return NextResponse.json({ success: false, error: 'Invalid case id' }, { status: 400 });
  try {
    return resultResponse(await hrOffboardingService.getCaseDetail(id));
  } catch (error) {
    return errorResponse(error, 'Failed to load offboarding case');
  }
}

/**
 * POST /api/admin/hr-tool/offboarding/[id] — one action on one case:
 *   { action: 'decide', decision: 'accept' | 'reject', approvedLwd?, noticeDays?, noticeWaivedDays?, accessMode?, note? }
 *   { action: 'cancel', note? }                   — revert an accepted exit before the LWD
 *   { action: 'reinstate', note }                 — undo an exit that already took effect
 *   { action: 'access', accessMode }              — 'alumni' | 'blocked' after the LWD
 *   { action: 'exit-now' }                        — end the notice today
 *   { action: 'handover', handoverNotes }
 *   { action: 'rehire', rehireEligible }          — true | false | null
 *   { action: 'clearance-update', itemId, status, note?, deductionAmount? }
 *   { action: 'clearance-add', category, item }
 *   { action: 'clearance-remove', itemId }
 *   { action: 'leads', toCredentialId }           — null = just remove the leaver from their leads
 *   { action: 'fnf-calculate' }                   — (re)build the Full & Final's calculated lines (draft)
 *   { action: 'fnf-save', version, lines }        — HR edits to the draft
 *   { action: 'fnf-approve', version }            — needs a fully cleared checklist
 *   { action: 'fnf-reopen', version }             — approved → draft
 *   { action: 'fnf-paid', version, paidOn, reference }
 *   { action: 'personal-email', personalEmail }
 *   { action: 'letter-issue', letterType: 'relieving' | 'experience', send? }  — snapshot + optional email
 *   { action: 'letter-send', letterType }         — (re)send an issued letter
 *   { action: 'complete' }                        — checklist cleared + F&F paid + relieving letter issued
 * F&F writes carry the version the screen loaded; a stale one gets 409.
 * Every state change is compare-and-set in the service: a stale screen gets 409, never an overwrite.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;
  const id = await caseId(params);
  if (!id) return NextResponse.json({ success: false, error: 'Invalid case id' }, { status: 400 });

  try {
    const [body, badBody] = await parseJsonBody<CaseActionBody>(request);
    if (badBody) return badBody;
    if (!body || typeof body !== 'object') return NextResponse.json({ success: false, error: 'Missing body' }, { status: 400 });
    const actor = auth.user.name || auth.user.email;
    switch (body.action) {
      case 'decide': return resultResponse(await hrOffboardingService.decide(id, body, actor));
      case 'cancel': return resultResponse(await hrOffboardingService.cancel(id, body.note, actor));
      case 'reinstate': return resultResponse(await hrOffboardingService.reinstate(id, body.note, actor));
      case 'access': return resultResponse(await hrOffboardingService.setAccess(id, body.accessMode, actor));
      case 'exit-now': return resultResponse(await hrOffboardingService.exitNow(id, actor));
      case 'handover': return resultResponse(await hrOffboardingService.setHandoverNotes(id, body.handoverNotes, actor));
      case 'rehire': return resultResponse(await hrOffboardingService.setRehireEligible(id, body.rehireEligible, actor));
      case 'clearance-update': return resultResponse(await hrOffboardingService.updateClearanceItem(id, body, actor));
      case 'clearance-add': return resultResponse(await hrOffboardingService.addClearanceItem(id, body, actor));
      case 'clearance-remove': return resultResponse(await hrOffboardingService.removeClearanceItem(id, body, actor));
      case 'leads': return resultResponse(await hrOffboardingService.handOverLeads(id, body.toCredentialId, actor));
      case 'fnf-calculate': return resultResponse(await hrOffboardingService.calculateFnf(id, actor));
      case 'fnf-save': return resultResponse(await hrOffboardingService.saveFnf(id, body, actor));
      case 'fnf-approve': return resultResponse(await hrOffboardingService.approveFnf(id, body, actor));
      case 'fnf-reopen': return resultResponse(await hrOffboardingService.reopenFnf(id, body, actor));
      case 'fnf-paid': return resultResponse(await hrOffboardingService.markFnfPaid(id, body, actor));
      case 'personal-email': return resultResponse(await hrOffboardingService.setPersonalEmail(id, body.personalEmail, actor));
      case 'letter-issue': return resultResponse(await hrOffboardingService.issueLetter(id, body.letterType, body.send, actor));
      case 'letter-send': return resultResponse(await hrOffboardingService.sendLetter(id, body.letterType, actor));
      case 'complete': return resultResponse(await hrOffboardingService.completeCase(id, actor));
      default: return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return errorResponse(error, 'Failed to update offboarding case');
  }
}
