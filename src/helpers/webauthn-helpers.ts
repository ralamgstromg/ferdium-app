// The WebAuthn page script (electron-webauthn-linux) adds a "Google Chrome"
// brand to navigator.userAgentData, but the Sec-CH-UA request headers do not
// carry it. Google treats that mismatch as an untrusted browser, so the script
// is not injected on Google sign-in pages, nor on claude.ai, which starts
// Google sign-in in its own page.
export const WEBAUTHN_SKIPPED_HOSTS = ['accounts.google.com', 'claude.ai'];

export const shouldInjectWebAuthnPageScript = (hostname: string): boolean =>
  !WEBAUTHN_SKIPPED_HOSTS.includes(hostname);
