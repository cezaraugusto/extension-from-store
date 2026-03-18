import {
  normalizeChromePlatformInfo,
  type ChromePlatformInfo,
} from '../platform';

const DEFAULT_CHROME_PLATFORM: ChromePlatformInfo = {
  os: 'linux',
  arch: 'x64',
};

export function getChromeDownloadUrl(
  id: string,
  platformInfo: ChromePlatformInfo = DEFAULT_CHROME_PLATFORM,
): string {
  const encoded = encodeURIComponent(id);
  const platform = normalizeChromePlatformInfo(platformInfo);
  const productId = 'chromiumcrx';
  const productChannel = 'unknown';
  const productVersion = '9999.0.9999.0';

  return [
    'https://clients2.google.com/service/update2/crx',
    '?response=redirect',
    `&os=${platform.os}`,
    `&arch=${platform.arch}`,
    `&os_arch=${platform.arch}`,
    `&nacl_arch=${platform.naclArch}`,
    `&prod=${productId}`,
    `&prodchannel=${productChannel}`,
    `&prodversion=${productVersion}`,
    '&acceptformat=crx2,crx3',
    `&x=id%3D${encoded}%26uc`,
  ].join('');
}
