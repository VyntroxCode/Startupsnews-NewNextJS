import { HrCredentialsRepository } from '@/modules/hr-credentials/repository/hr-credentials.repository';
import { HrCredentialsService } from '@/modules/hr-credentials/service/hr-credentials.service';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import { HrOffboardingService } from '@/modules/hr-offboarding/service/hr-offboarding.service';

export const hrCredentialsService = new HrCredentialsService(
  new HrCredentialsRepository(),
  new PanelAdminsRepository()
);

export const hrOffboardingService = new HrOffboardingService();
