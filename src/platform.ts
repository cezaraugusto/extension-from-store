export type ChromePlatformOs = 'mac' | 'win' | 'linux';

export type ChromePlatformArch = 'x64' | 'arm64' | 'x86';

export type ChromePlatformInfo = {
  os: ChromePlatformOs;
  arch: ChromePlatformArch;
  naclArch?: ChromePlatformArch;
};

export function normalizeChromePlatformInfo(
  platform: ChromePlatformInfo,
): Required<ChromePlatformInfo> {
  return {
    os: platform.os,
    arch: platform.arch,
    naclArch: platform.naclArch || platform.arch,
  };
}
