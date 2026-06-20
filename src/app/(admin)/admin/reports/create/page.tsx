'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAdminToken, getAuthHeaders, withAdminToken } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import ImageUpload from '@/components/admin/ImageUpload';
import { PDFDocument } from 'pdf-lib';

async function countPdfPagesFromFile(file: File): Promise<number | null> {
  try {
    const buffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(new Uint8Array(buffer), {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });
    return pdf.getPageCount();
  } catch {
    return null;
  }
}

const formatBytes = (bytes: number | null, decimals = 2) => {
  if (bytes === 0 || bytes === null) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function AdminReportCreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number | ''>('');
  const [mimeType, setMimeType] = useState('');
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fileUploadError, setFileUploadError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError('');
    setSuccess(false);
    setFileUploadError('');

    if (reportFile && fileUrl) {
      setError('Please either upload a file OR enter a URL, not both.');
      setUploading(false);
      return;
    }

    if (!reportFile && !fileUrl) {
      setError('Please upload a report file or provide a URL.');
      setUploading(false);
      return;
    }

    let finalFileUrl = fileUrl;
    let finalFileName = fileName;
    let finalFileSize = fileSize;
    let finalMimeType = mimeType;

    try {
      const token = getAdminToken();
      if (!token) {
        throw new Error('Authentication required. Please login again.');
      }

      if (reportFile) {
        // Upload report file to S3
        const safeFilename = reportFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const presignResponse = await fetch('/api/admin/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: safeFilename,
            contentType: reportFile.type || 'application/octet-stream',
            _token: token,
          }),
        });

        if (!presignResponse.ok) {
          const txt = await presignResponse.text().catch(() => '');
          throw new Error(`Failed to get pre-signed URL for report file (${presignResponse.status}). ${txt || 'Please try again.'}`);
        }

        const presignResult = await presignResponse.json();
        const uploadUrl = presignResult?.data?.uploadUrl as string | undefined;
        const s3FileUrl = presignResult?.data?.fileUrl as string | undefined;

        if (!uploadUrl || !s3FileUrl) {
          throw new Error('S3 upload URL was not returned by the server for report file.');
        }

        const s3Response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': reportFile.type || 'application/octet-stream',
          },
          body: reportFile,
        });

        if (!s3Response.ok) {
          const txt = await s3Response.text().catch(() => '');
          throw new Error(`S3 upload failed for report file (${s3Response.status}). ${txt || 'Please try again.'}`);
        }

        finalFileUrl = s3FileUrl;
        finalFileName = reportFile.name;
        finalFileSize = reportFile.size;
        finalMimeType = reportFile.type;
      }

      const res = await fetch(withAdminToken('/api/admin/reports'), {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          fileUrl: finalFileUrl,
          thumbnailUrl: thumbnailUrl || null,
          fileName: finalFileName || null,
          fileSize: finalFileSize || null,
          pageCount: pageCount ?? null,
          mimeType: finalMimeType || null,
          isActive,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        console.error('API Error creating report:', data);
        throw new Error(data.error || 'Failed to create report');
      }

      setSuccess(true);
      setTitle('');
      setDescription('');
      setFileUrl('');
      setThumbnailUrl('');
      setFileName('');
      setFileSize('');
      setMimeType('');
      setPageCount(null);
      setIsActive(true);
      setReportFile(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Optionally redirect after a short delay
      setTimeout(() => router.push('/admin/reports'), 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleReportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setReportFile(null);
      setFileName('');
      setFileSize('');
      setMimeType('');
      setPageCount(null);
      setFileUrl(''); // Clear URL if a file is selected
      setFileUploadError('');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      setFileUploadError('Unsupported file type. Please upload PDF, JPEG, PNG, DOCX, XLSX, or CSV.');
      setReportFile(null);
      setFileName('');
      setFileSize('');
      setMimeType('');
      setPageCount(null);
      setFileUrl('');
      return;
    }

    // Max file size 50MB (same as S3 upload limit)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileUploadError('File size exceeds 50MB limit.');
      setReportFile(null);
      setFileName('');
      setFileSize('');
      setMimeType('');
      setPageCount(null);
      setFileUrl('');
      return;
    }

    setReportFile(file);
    setFileName(file.name);
    setFileSize(file.size);
    setMimeType(file.type);
    setFileUrl(''); // Ensure URL is cleared when a file is selected
    setFileUploadError('');

    if (file.type === 'application/pdf') {
      countPdfPagesFromFile(file).then(setPageCount);
    } else {
      setPageCount(null);
    }
  };

  return (
    <AdminErrorBoundary>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/admin/reports" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.875rem' }}>
              ← Back to Reports
            </Link>
            <h2 style={{ fontSize: '2.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#0f172a', letterSpacing: '-0.02em', marginTop: '0.5rem' }}>
              Add New Report
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
              Upload a new research report for members.
            </p>
          </div>
        </div>

        {success && (
          <div style={{
            background: '#ecfdf5',
            color: '#047857',
            padding: '0.875rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            border: '1px solid #6ee7b7',
          }}>
            Report created successfully! Redirecting...
          </div>
        )}

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#991b1b',
            padding: '0.875rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            border: '1px solid #fca5a5',
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)', overflow: 'hidden', padding: '1.5rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <label htmlFor="title" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '0.25rem' }}>Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label htmlFor="description" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '0.25rem' }}>Description <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                ></textarea>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#0f172a', marginBottom: '1rem' }}>File & Thumbnail Upload</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <ImageUpload
                      label="Report Thumbnail (Image)"
                      value={thumbnailUrl}
                      onChange={setThumbnailUrl}
                      accept="image/*"
                    />
                  </div>
                  <div>
                    <label htmlFor="reportFile" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '0.25rem' }}>Report File (PDF, etc.) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="file"
                      id="reportFile"
                      onChange={handleReportFileChange}
                      required={!fileUrl}
                      accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.9375rem',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    {reportFile && (
                      <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>Selected: {reportFile.name} ({formatBytes(reportFile.size)})</p>
                    )}
                    {!reportFile && !fileUrl && (
                      <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>Or provide a URL:</p>
                    )}
                    <input
                      type="url"
                      id="fileUrl"
                      value={fileUrl}
                      onChange={(e) => {
                        setFileUrl(e.target.value);
                        if (e.target.value) {
                          setReportFile(null); // Clear file if URL is entered
                        }
                      }}
                      required={!reportFile}
                      placeholder="Enter URL to report file (e.g., S3 URL)"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.9375rem',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        marginTop: reportFile ? '0.5rem' : '0',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                      disabled={!!reportFile}
                    />
                    {fileUploadError && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem 1.25rem',
                        background: '#fef2f2',
                        color: '#991b1b',
                        fontSize: '0.875rem',
                        borderRadius: '8px',
                        border: '1px solid #fca5a5',
                      }}>
                        <strong>File Error:</strong> {fileUploadError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.25rem' }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{
                    height: '1.25rem',
                    width: '1.25rem',
                    accentColor: '#6366f1',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
                <label htmlFor="isActive" style={{ marginLeft: '0.5rem', display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568' }}>Active (Show to users)</label>
              </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', marginTop: '2rem' }}>
              <button
                type="submit"
                disabled={uploading || !title || !description || (!fileUrl && !reportFile)}
                style={{
                  padding: '0.875rem 1.5rem',
                  background: uploading ? '#a0aec0' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '0.9375rem',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => { if (!uploading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.4)'; } }}
                onMouseLeave={(e) => { if (!uploading) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)'; } }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {uploading ? 'Creating...' : 'Create Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminErrorBoundary>
  );
}
