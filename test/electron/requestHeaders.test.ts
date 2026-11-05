import {
  setHeader,
  urlMatchesPatterns,
} from '../../src/electron/requestHeaders';

describe('urlMatchesPatterns', () => {
  it('matches Electron URL patterns', () => {
    expect(urlMatchesPatterns(['*://*/*'], 'https://web.whatsapp.com/')).toBe(
      true,
    );
    expect(urlMatchesPatterns(['<all_urls>'], 'http://a.test/x')).toBe(true);
    expect(
      urlMatchesPatterns(
        ['https://*.example.com/*'],
        'https://a.example.com/p',
      ),
    ).toBe(true);
    expect(
      urlMatchesPatterns(['https://*.example.com/*'], 'https://example.org/'),
    ).toBe(false);
  });
});

describe('headers', () => {
  it('sets header names case-insensitively, keeping the request spelling', () => {
    const headers: Record<string, string> = { 'Sec-CH-UA': 'a' };
    setHeader(headers, 'sec-ch-ua', 'b');
    expect(headers).toEqual({ 'Sec-CH-UA': 'b' });
  });
});
