function getPlatformInfo() {
  const platform = process.platform;
  const arch = process.arch;
  const os =
    platform === 'darwin' ? 'mac' : platform === 'win32' ? 'win' : 'linux';
  const archName =
    arch === 'x64'
      ? 'x64'
      : arch === 'arm64'
        ? 'arm64'
        : arch === 'ia32'
          ? 'x86'
          : 'x64';
  return {
    os,
    arch: archName,
    naclArch: archName,
  };
}

export function getChromeDownloadUrl(id: string): string {
  const encoded = encodeURIComponent(id);
  const platform = getPlatformInfo();
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
