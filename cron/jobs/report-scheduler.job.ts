import { createLogger } from '@/shared/utils/logger';
import { ReportsRepository } from '@/modules/reports/repository/reports.repository';

const log = createLogger('report-scheduler');
const repo = new ReportsRepository();

export class ReportSchedulerJob {
  async execute(): Promise<{ published: number }> {
    const published = await repo.publishDue();
    if (published > 0) {
      log.info('Report scheduler: published due reports', { published });
    }
    return { published };
  }
}
