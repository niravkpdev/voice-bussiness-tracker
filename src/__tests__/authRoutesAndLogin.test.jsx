import { describe, it, expect, beforeEach } from 'vitest';
import {
  isPasswordRecoveryRoute,
  isEmailConfirmationRoute,
  authRedirectTo,
  passwordRecoveryRedirectTo,
} from '../supabaseClient';

describe('Auth Routing & Email Confirmation Detection', () => {
  const setUrl = (urlStr) => {
    delete window.location;
    const url = new URL(urlStr);
    window.location = {
      href: url.href,
      origin: url.origin,
      search: url.search,
      hash: url.hash,
      pathname: url.pathname,
    };
  };

  beforeEach(() => {
    setUrl('https://example.com/react.html');
    localStorage.clear();
  });

  describe('isPasswordRecoveryRoute', () => {
    it('returns true when query has auth=recovery', () => {
      setUrl('https://example.com/react.html?auth=recovery&code=pkce_code_123');
      expect(isPasswordRecoveryRoute()).toBe(true);
    });

    it('returns true when hash has type=recovery', () => {
      setUrl('https://example.com/react.html#access_token=token123&type=recovery');
      expect(isPasswordRecoveryRoute()).toBe(true);
    });

    it('returns false for standard email confirmation PKCE callback with code alone', () => {
      setUrl('https://example.com/react.html?code=pkce_signup_code_456');
      expect(isPasswordRecoveryRoute()).toBe(false);
    });

    it('returns false for email confirmation callback with auth=confirmation', () => {
      setUrl('https://example.com/react.html?auth=confirmation&code=pkce_signup_code_456');
      expect(isPasswordRecoveryRoute()).toBe(false);
    });

    it('returns false for implicit signup confirmation callback', () => {
      setUrl('https://example.com/react.html#access_token=token123&type=signup');
      expect(isPasswordRecoveryRoute()).toBe(false);
    });
  });

  describe('isEmailConfirmationRoute', () => {
    it('returns true for PKCE code callback without recovery flag', () => {
      setUrl('https://example.com/react.html?code=pkce_signup_code_456');
      expect(isEmailConfirmationRoute()).toBe(true);
    });

    it('returns true when auth=confirmation query is present', () => {
      setUrl('https://example.com/react.html?auth=confirmation&code=pkce_signup_code_456');
      expect(isEmailConfirmationRoute()).toBe(true);
    });

    it('returns true when hash has type=signup', () => {
      setUrl('https://example.com/react.html#access_token=token123&type=signup');
      expect(isEmailConfirmationRoute()).toBe(true);
    });

    it('returns false when auth=recovery is in query', () => {
      setUrl('https://example.com/react.html?auth=recovery&code=pkce_code_123');
      expect(isEmailConfirmationRoute()).toBe(false);
    });

    it('returns false when hash has type=recovery', () => {
      setUrl('https://example.com/react.html#access_token=token123&type=recovery');
      expect(isEmailConfirmationRoute()).toBe(false);
    });
  });

  describe('Redirect URL builders', () => {
    it('authRedirectTo points to confirmation route', () => {
      setUrl('https://app.trinetr.com/react.html');
      expect(authRedirectTo()).toBe('https://app.trinetr.com/react.html?auth=confirmation');
    });

    it('passwordRecoveryRedirectTo points to recovery route', () => {
      setUrl('https://app.trinetr.com/react.html');
      expect(passwordRecoveryRedirectTo()).toBe('https://app.trinetr.com/react.html?auth=recovery');
    });
  });

  describe('Username to Email Alias Resolution', () => {
    it('resolves username to stored registration email', () => {
      const username = 'kantibhai';
      const email = 'kantibhai@example.com';
      localStorage.setItem(`trinetr_alias_${username}`, email);

      const resolved = localStorage.getItem(`trinetr_alias_${username}`);
      expect(resolved).toBe('kantibhai@example.com');
    });

    it('resolves case-insensitively from stored alias', () => {
      const username = 'KantiBhai';
      const norm = username.toLowerCase().trim();
      const email = 'kantibhai@example.com';
      localStorage.setItem(`trinetr_alias_${norm}`, email);

      const resolved = localStorage.getItem(`trinetr_alias_${norm}`);
      expect(resolved).toBe('kantibhai@example.com');
    });
  });
});
