/**
 * ANKUR DRYICE — safe staged update discovery.
 * No hidden downloads, APK installer permissions, silent self-update or arbitrary URLs.
 * Manifest publishing on the verified HTTPS website is a SEPARATE owner-approved task.
 *
 * For installed Play Store builds, show the official Play listing. A future native
 * Play Core integration can use Google's flexible update flow.
 */
export const ANDROID_VERSION_CODE = Number(import.meta.env?.VITE_ANDROID_VERSION_CODE || 65);
export const ANDROID_VERSION_NAME = import.meta.env?.VITE_ANDROID_VERSION_NAME || '1.0.65';
export const UPDATE_MANIFEST_URL = 'https://ankurdryice.store/app-updates/android-stable.json';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.ankurdryice.events';
/** Owner-approved (2026-11-11) permanent APK hosting: GitHub Releases of the app's own repo. */
export const GITHUB_REPO_PATH = '/ankur2066/-ankur-order-app-/';
export const GITHUB_LATEST_RELEASE_URL = 'https://api.github.com/repos/ankur2066/-ankur-order-app-/releases/latest';

export interface UpdateRelease {
  versionCode: number;
  versionName: string;
  channel: 'play' | 'signed_apk';
  url: string;
  notes?: string;
}

export function validateUpdateManifest(value: unknown, currentVersionCode = ANDROID_VERSION_CODE): UpdateRelease | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const versionCode = obj.versionCode;
  const versionName = obj.versionName;
  const channel = obj.channel;
  const targetUrl = obj.url;
  if (typeof versionCode !== 'number' || !Number.isSafeInteger(versionCode) || versionCode <= currentVersionCode ||
      versionCode > 10_000_000 || typeof versionName !== 'string' ||
      !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(versionName) ||
      (channel !== 'play' && channel !== 'signed_apk') || typeof targetUrl !== 'string') return null;
  let url: URL;
  try { url = new URL(targetUrl); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return null;
  if (channel === 'play') {
    if (targetUrl !== PLAY_STORE_URL) return null;
  } else {
    // The manifest is remote data: permit one canonical APK filename only.
    // Encoded slashes, path segments and lookalike extensions are not releases.
    if (url.origin !== 'https://ankurdryice.store' ||
        !/^\/app-releases\/[A-Za-z0-9][A-Za-z0-9._-]*\.apk$/.test(url.pathname) ||
        url.search !== '' ||
        url.pathname.includes('..') ||
        url.href !== targetUrl) return null;
  }
  const notes = typeof obj.notes === 'string' ? obj.notes.trim().slice(0, 150) : undefined;
  return { versionCode, versionName, channel, url: targetUrl, ...(notes ? {notes} : {}) };
}

/**
 * Validate the GitHub "latest release" response. Only a published, non-draft,
 * non-prerelease tag of the form v1.0.N counts (version code N), and only an .apk
 * asset downloaded from this repository's own release path is accepted.
 */
export function validateGithubRelease(value: unknown, currentVersionCode = ANDROID_VERSION_CODE): UpdateRelease | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  if (obj.draft === true || obj.prerelease === true || typeof obj.tag_name !== 'string') return null;
  const tag = obj.tag_name.match(/^v?(1\.0\.(\d{2,6}))$/);
  if (!tag) return null;
  const versionName = tag[1];
  const versionCode = Number(tag[2]);
  if (!Number.isSafeInteger(versionCode) || versionCode <= currentVersionCode) return null;
  const assets = Array.isArray(obj.assets) ? obj.assets : [];
  for (const asset of assets) {
    if (typeof asset !== 'object' || asset === null) continue;
    const href = (asset as Record<string, unknown>).browser_download_url;
    if (typeof href !== 'string') continue;
    let url: URL;
    try { url = new URL(href); } catch { continue; }
    if (url.protocol !== 'https:' || url.host !== 'github.com' || url.username || url.password || url.port || url.hash || url.search) continue;
    const prefix = GITHUB_REPO_PATH + 'releases/download/' + obj.tag_name + '/';
    if (!url.pathname.startsWith(prefix) || url.pathname.includes('..')) continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.apk$/.test(url.pathname.slice(prefix.length))) continue;
    const notes = typeof obj.name === 'string' ? obj.name.trim().slice(0, 150) : undefined;
    return {versionCode, versionName, channel: 'signed_apk', url: url.href, ...(notes ? {notes} : {})};
  }
  return null;
}

async function readJson(fetcher: typeof fetch, url: string, maxBytes: number, init: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetcher(url, {...init, signal: controller.signal});
    if (!response.ok || response.redirected === true) return null;
    const lengthHeader = response.headers?.get?.('content-length');
    if (lengthHeader && /^\d+$/.test(lengthHeader) && Number(lengthHeader) > maxBytes) return null;
    const raw = await response.text();
    if (raw.length > maxBytes) return null;
    try { return JSON.parse(raw); } catch { return null; }
  } catch { return null; }
  finally { clearTimeout(abortTimer); }
}

/** Website manifest first (if ever published), then the owner-approved GitHub release. */
export async function checkForUpdate(fetcher: typeof fetch = fetch, currentVersionCode = ANDROID_VERSION_CODE): Promise<UpdateRelease | null> {
  const site = await checkSiteManifest(fetcher, currentVersionCode);
  if (site) return site;
  const latest = await readJson(fetcher, GITHUB_LATEST_RELEASE_URL, 262144, {cache: 'no-store', headers: {Accept: 'application/vnd.github+json'}});
  return validateGithubRelease(latest, currentVersionCode);
}

async function checkSiteManifest(fetcher: typeof fetch = fetch, currentVersionCode = ANDROID_VERSION_CODE): Promise<UpdateRelease | null> {
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 6500);
  try {
    // Explicit 'no-store' on app-open; the website must permit cross-origin requests.
    const response = await fetcher(UPDATE_MANIFEST_URL, {cache:'no-store',signal:controller.signal,redirect:'error'});
    if (!response.ok || response.redirected === true) return null;
    // Avoid reading a declared oversized payload even on a trusted HTTPS host.
    const lengthHeader = response.headers?.get?.('content-length');
    if (lengthHeader && /^\d+$/.test(lengthHeader) && Number(lengthHeader) > 8192) return null;
    const raw = await response.text();
    if (raw.length > 8192) return null;
    let json: unknown;
    try {json = JSON.parse(raw);} catch {return null;}
    return validateUpdateManifest(json, currentVersionCode);
  } catch { return null; }
  finally {clearTimeout(abortTimer);}
}
