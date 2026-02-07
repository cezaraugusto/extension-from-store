import { describe, expect, test } from 'vitest';
import {
  detectStoreFromUrl,
  extractChromeIdFromUrl,
  extractEdgeIdFromUrl,
  extractFirefoxSlugFromUrl,
} from '../src/stores/resolve-slug';

describe('extractExtensionIdFromUrl', () => {
  test('extracts from Chrome Web Store URL', () => {
    const url =
      'https://chromewebstore.google.com/detail/adblock-plus-free-ad-bloc/cfhdojbkjhnklbpkdaibdccddilifddb';

    expect(extractChromeIdFromUrl(url)).toBe(
      'cfhdojbkjhnklbpkdaibdccddilifddb',
    );
  });

  test('extracts from Edge Add-ons URL', () => {
    const url =
      'https://microsoftedge.microsoft.com/addons/detail/adblock-plus-free-ad-bl/gmgoamodcdcjnbaobigkjelfplakmdhh';

    expect(extractEdgeIdFromUrl(url)).toBe('gmgoamodcdcjnbaobigkjelfplakmdhh');
  });

  test('extracts Firefox slug from URL', () => {
    const url = 'https://addons.mozilla.org/en-US/firefox/addon/adblock-plus/';

    expect(extractFirefoxSlugFromUrl(url)).toBe('adblock-plus');
  });

  test('detects store from URL', () => {
    expect(
      detectStoreFromUrl(
        'https://chromewebstore.google.com/detail/adblock-plus-free-ad-bloc/cfhdojbkjhnklbpkdaibdccddilifddb',
      ),
    ).toBe('chrome');

    expect(
      detectStoreFromUrl(
        'https://microsoftedge.microsoft.com/addons/detail/adblock-plus-free-ad-bl/gmgoamodcdcjnbaobigkjelfplakmdhh',
      ),
    ).toBe('edge');

    expect(
      detectStoreFromUrl(
        'https://addons.mozilla.org/en-US/firefox/addon/adblock-plus/',
      ),
    ).toBe('firefox');
  });
});
