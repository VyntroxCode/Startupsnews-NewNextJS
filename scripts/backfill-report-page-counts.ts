import { loadEnvConfig } from '@next/env';
import { ReportsRepository } from '@/modules/reports/repository/reports.repository';
import { fetchPdfPageCount } from '@/modules/reports/utils/pdf-page-count';

loadEnvConfig(process.cwd());

async function main() {
  const repo = new ReportsRepository();
  const reports = await repo.findAll();

  const pdfReports = reports.filter((report) => {
    const mimeType = (report.mime_type || '').toLowerCase();
    return mimeType === 'application/pdf' || report.file_url.toLowerCase().endsWith('.pdf');
  });

  console.log(`Found ${pdfReports.length} PDF reports.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const report of pdfReports) {
    if (report.page_count && report.page_count > 0) {
      skippedCount += 1;
      console.log(`Skipping report ${report.id} (${report.title}) - page_count already set to ${report.page_count}`);
      continue;
    }

    try {
      const pageCount = await fetchPdfPageCount(report.file_url);
      await repo.update(report.id, {
        title: report.title,
        description: report.description,
        fileUrl: report.file_url,
        thumbnailUrl: report.thumbnail_url,
        fileName: report.file_name,
        fileSize: report.file_size,
        pageCount,
        mimeType: report.mime_type,
        isActive: report.is_active === 1,
      });

      updatedCount += 1;
      console.log(`Updated report ${report.id} (${report.title}) -> page_count=${pageCount ?? 'null'}`);
    } catch (error) {
      console.error(`Failed to update report ${report.id} (${report.title}):`, error);
    }
  }

  console.log(`Done. Updated ${updatedCount} reports, skipped ${skippedCount}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });