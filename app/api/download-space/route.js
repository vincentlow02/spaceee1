import 'server-only';
import { createSpaceDownloadResponse } from '@/lib/spaceImageDownload';

export const runtime = 'nodejs';

export async function POST(request) {
  return createSpaceDownloadResponse(request);
}
