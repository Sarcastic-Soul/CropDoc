import { Directory, File, Paths } from 'expo-file-system';

const scansDir = new Directory(Paths.document, 'scans');

function ensureScansDir(): void {
  if (!scansDir.exists) {
    scansDir.create({ intermediates: true });
  }
}

// Camera captures and gallery picks both land in expo's cache directory,
// which Android can reclaim at any time under storage pressure — copy into
// permanent app storage before saving the scan record, or history thumbnails
// eventually go missing.
export async function persistScanPhoto(sourceUri: string): Promise<string> {
  ensureScansDir();
  const extension = sourceUri.split('.').pop()?.split(/[?#]/)[0] || 'jpg';
  const destination = new File(scansDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
  await new File(sourceUri).copy(destination);
  return destination.uri;
}
