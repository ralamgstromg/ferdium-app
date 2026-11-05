/**
 * Minimal preload for popup windows (e.g. Google auth popups) on Linux.
 * Injects the WebAuthn page script into the main world via DOM script element
 * and exposes the electronWebAuthn IPC bridge via contextBridge.
 *
 * This runs in popup BrowserWindows opened by setWindowOpenHandler with
 * { action: 'allow' } -- these windows don't get the recipe preload.
 */
import { contextBridge, ipcRenderer } from 'electron';

// Inject the WebAuthn page script into the main world BEFORE page scripts run.
// process.once('document-start') fires at document creation, before any <script> tags.
// The DOM <script> element executes in world 0 (main world), not the isolated preload world.
// The main process passes the page script and the skipped hosts as arguments
// when it creates the popup (a sandboxed preload cannot require local modules,
// and a synchronous IPC call during a navigation breaks it).
const readArgument = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return process.argv
    .find(argument => argument.startsWith(prefix))
    ?.slice(prefix.length);
};
const webauthnPageScript = readArgument('ferdium-webauthn-script') ?? '';
const skippedHosts = (readArgument('ferdium-webauthn-skip') ?? '').split(',');

// Inject the WebAuthn page script into the main world BEFORE page scripts run.
// process.once('document-start') fires at document creation, before any <script> tags.
// The DOM <script> element executes in world 0 (main world), not the isolated preload world.
process.once('document-start', () => {
  if (!webauthnPageScript || skippedHosts.includes(window.location.hostname)) {
    return;
  }
  const script = document.createElement('script');
  script.textContent = webauthnPageScript;
  document.documentElement.append(script);
  script.remove();
});

// Expose the IPC bridge so the page script can route WebAuthn calls to main process.
contextBridge.exposeInMainWorld('electronWebAuthn', {
  create: (options: any) => ipcRenderer.invoke('webauthn:create', options),
  get: (options: any) => ipcRenderer.invoke('webauthn:get', options),
  hasCredentials: (rpId: string) =>
    ipcRenderer.invoke('webauthn:hasCredentials', rpId),
});
