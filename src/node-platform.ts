import type { ChromePlatformArch, ChromePlatformInfo } from './platform';

function getNodeArch(): ChromePlatformArch {
  if (process.arch === 'arm64') return 'arm64';
  if (process.arch === 'ia32') return 'x86';
  return 'x64';
}

export function getNodeChromePlatformInfo(): ChromePlatformInfo {
  return {
    os:
      process.platform === 'darwin'
        ? 'mac'
        : process.platform === 'win32'
          ? 'win'
          : 'linux',
    arch: getNodeArch(),
  };
}
