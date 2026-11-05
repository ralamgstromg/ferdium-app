import { shouldInjectWebAuthnPageScript } from '../../src/helpers/webauthn-helpers';

describe('shouldInjectWebAuthnPageScript', () => {
  it('skips Google sign-in pages and claude.ai, where the brand mismatch breaks sign-in', () => {
    expect(shouldInjectWebAuthnPageScript('accounts.google.com')).toBe(false);
    expect(shouldInjectWebAuthnPageScript('claude.ai')).toBe(false);
  });

  it('keeps passkey support on other sites, including Google subdomains', () => {
    expect(shouldInjectWebAuthnPageScript('mail.google.com')).toBe(true);
    expect(
      shouldInjectWebAuthnPageScript('accounts.google.com.example.test'),
    ).toBe(true);
    expect(shouldInjectWebAuthnPageScript('app.claude.ai')).toBe(true);
  });
});
