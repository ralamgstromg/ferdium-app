import { cpus } from 'node:os';
import macosVersion from 'macos-version';
import {
  chromeVersion,
  is64Bit,
  isMac,
  isWindows,
  osArch,
  osRelease,
} from '../environment';

const macOS = () => {
  const version = macosVersion() ?? '';
  let cpuName = cpus()[0].model.split(' ')[0];
  if (cpuName.includes('(')) {
    // eslint-disable-next-line prefer-destructuring
    cpuName = cpuName.split('(')[0];
  }
  return `Macintosh; ${cpuName} macOS ${version.replaceAll('.', '_')}`;
};

const windows = () => {
  const version = osRelease;
  const [majorVersion, minorVersion] = version.split('.');
  const archString = is64Bit ? 'Win64' : 'Win32';
  return `Windows NT ${majorVersion}.${minorVersion}; ${archString}; ${osArch}`;
};

const linux = () => {
  const archString = is64Bit ? 'x86_64' : osArch;
  return `X11; Linux ${archString}`;
};

export default function userAgent() {
  let platformString;

  if (isMac) {
    platformString = macOS();
  } else if (isWindows) {
    platformString = windows();
  } else {
    platformString = linux();
  }

  return `Mozilla/5.0 (${platformString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}

// Google rejects sign-in from embedded browsers that send a versioned Chrome
// token together with Electron-specific traits; without the version it accepts
// the request (same workaround as the service webviews in models/UserAgent).
export const chromelessUserAgent = (): string =>
  userAgent().replace(/Chrome\/[\d.]+/, 'Chrome');
