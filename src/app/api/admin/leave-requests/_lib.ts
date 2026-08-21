import { HrCredentialsRepository } from '@/modules/hr-credentials/repository/hr-credentials.repository';
import { HrCredentialsService } from '@/modules/hr-credentials/service/hr-credentials.service';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import { HrToolRepository } from '@/modules/hr-tool/repository/hr-tool.repository';
import { HrToolService } from '@/modules/hr-tool/service/hr-tool.service';

export const hrCredentialsService = new HrCredentialsService(
  new HrCredentialsRepository(),
  new PanelAdminsRepository()
);

export const hrToolService = new HrToolService(new HrToolRepository());

export const LEAVE_ROLES = ['event_admin', 'publisher_admin'] as const;
