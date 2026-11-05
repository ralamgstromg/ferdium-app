import { isGoogleSignInUrl } from '../../src/helpers/userAgent-helpers';

describe('isGoogleSignInUrl', () => {
  it('matches Google account pages', () => {
    expect(isGoogleSignInUrl('https://accounts.google.com/')).toBe(true);
    expect(
      isGoogleSignInUrl('https://accounts.google.com/o/oauth2/v2/auth?x=1'),
    ).toBe(true);
  });

  it('ignores other pages, including about:blank popups', () => {
    expect(isGoogleSignInUrl('about:blank')).toBe(false);
    expect(isGoogleSignInUrl('https://claude.ai/login')).toBe(false);
    expect(isGoogleSignInUrl('http://accounts.google.com/')).toBe(false);
    expect(isGoogleSignInUrl('https://accounts.google.com.evil.test/')).toBe(
      false,
    );
    expect(isGoogleSignInUrl('not a url')).toBe(false);
  });
});
