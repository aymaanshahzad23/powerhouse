import { getJob } from '../_shared/job-store.ts';
import { jsonResponse, optionsResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  if (req.method !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const url = new URL(req.url);
  const jobId = (url.searchParams.get('jobId') || '').trim();
  if (!jobId) {
    return jsonResponse(400, { error: 'jobId query parameter is required' });
  }

  let job;
  try {
    job = await getJob(jobId);
  } catch (err) {
    return jsonResponse(500, {
      error: err instanceof Error ? err.message : 'Could not read job status',
    });
  }

  if (!job) {
    return jsonResponse(200, {
      status: 'processing',
      message: 'Starting conversion…',
    });
  }

  if (job.status === 'done') {
    return jsonResponse(200, { status: 'done', result: job.result });
  }

  if (job.status === 'error') {
    return jsonResponse(200, { status: 'error', error: job.error || 'Mapping failed' });
  }

  return jsonResponse(200, {
    status: job.status || 'processing',
    message: job.message || 'Processing…',
  });
});
