import { HrToolRepository } from '@/modules/hr-tool/repository/hr-tool.repository';
import { HrToolService } from '@/modules/hr-tool/service/hr-tool.service';

export const hrToolService = new HrToolService(new HrToolRepository());
