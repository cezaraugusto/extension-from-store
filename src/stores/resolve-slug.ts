export type StoreFromUrl = 'chrome' | 'edge' | 'firefox' | null;

const chromePattern =
  /^https?:\/\/(?:chrome\.google\.com\/webstore|chromewebstore\.google\.com)\/.+?\/([a-p]{32})(?=[\/#?]|$)/i;
const chromeDownloadPattern =
  /^https?:\/\/clients2\.google\.com\/service\/update2\/crx\b.*?%3D([a-p]{32})%26uc/i;
const edgePattern =
  /^https?:\/\/microsoftedge\.microsoft\.com\/addons\/.+?\/([a-z]{32})(?=[\/#?]|$)/i;
const edgeDownloadPattern =
  /^https?:\/\/edge\.microsoft\.com\/extensionwebstorebase\/v1\/crx\b.*?%3D([a-z]{32})%26/i;
const firefoxPattern =
  /^https?:\/\/((?:reviewers\.)?(?:addons\.mozilla\.org|addons(?:-dev)?\.allizom\.org))\/.*?(?:addon|review)\/([^/<>"'?#]+)/i;
const firefoxDownloadPattern =
  /^https?:\/\/(addons\.mozilla\.org|addons(?:-dev)?\.allizom\.org)\/[^?#]*\/downloads\/latest\/([^/?#]+)/i;

export function detectStoreFromUrl(url: string): StoreFromUrl {
  if (chromePattern.test(url) || chromeDownloadPattern.test(url)) {
    return 'chrome';
  }

  if (edgePattern.test(url) || edgeDownloadPattern.test(url)) {
    return 'edge';
  }

  if (firefoxPattern.test(url) || firefoxDownloadPattern.test(url)) {
    return 'firefox';
  }

  return null;
}


export function extractChromeIdFromUrl(url: string): string | null {
  const match = chromePattern.exec(url) || chromeDownloadPattern.exec(url);
  return match ? match[1] : null;
}

export function extractEdgeIdFromUrl(url: string): string | null {
  const match = edgePattern.exec(url) || edgeDownloadPattern.exec(url);
  return match ? match[1] : null;
}

export function extractFirefoxSlugFromUrl(url: string): string | null {
  const match = firefoxPattern.exec(url) || firefoxDownloadPattern.exec(url);
  return match ? match[2] : null;
}
