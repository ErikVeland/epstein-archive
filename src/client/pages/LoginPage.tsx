import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Box } from '@client/design-system/components/layout/Box';
import { LqText } from '@client/design-system/components/typography/Text';
import styles from './LoginPage.module.css';
import { Button, Input } from '@client/design-system/lib';
import { apiClient } from '../services/apiClient';
import { createUserPasskey, signLoginChallenge } from '../utils/cryptoIdentity';
import type { User } from '../types/auth';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Post-Invite & Passkey registration states
  const [inviteVerifying, setInviteVerifying] = useState(false);
  const [showPostInviteModal, setShowPostInviteModal] = useState(false);
  const [currentUserForPasskey, setCurrentUserForPasskey] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySuccess, setPasskeySuccess] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleVerifyInvite = useCallback(
    async (token: string) => {
      setError('');
      setInviteVerifying(true);
      try {
        const data = await apiClient.post<{ user: User; accessToken: string }>(
          '/auth/verify-invite',
          {
            token,
          },
        );
        login(data.user, data.accessToken);
        setCurrentUserForPasskey(data.user);
        setShowPostInviteModal(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify invitation link');
      } finally {
        setInviteVerifying(false);
      }
    },
    [login],
  );

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      handleVerifyInvite(token);
    }
  }, [handleVerifyInvite]);

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Guest login failed');
      }

      if (!data.accessToken || !data.user) {
        throw new Error('Invalid server response: missing token or user data');
      }

      login(data.user, data.accessToken);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (!data.accessToken || !data.user) {
        throw new Error('Invalid server response: missing token or user data');
      }

      login(data.user, data.accessToken);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!username.trim()) {
      setError('Please enter your username to sign in with a Passkey');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Fetch challenge and allowed credentials from the server
      const { challenge, userId, credentials } = await apiClient.post<{
        challenge: string;
        userId: string;
        credentials: Array<{ id: string }>;
      }>('/auth/webauthn/login/options', { username });

      // 2. Query local storage to find a matching registered credential
      const credsKey = `epstein_archive_user_credentials_${userId}`;
      const localCreds = JSON.parse(localStorage.getItem(credsKey) || '[]');
      const matchingCred = credentials.find((c) => localCreds.includes(c.id));

      if (!matchingCred) {
        throw new Error(
          'No matching Passkey found for this user on this device. If you are on a new device, please request a new Magic Invite Link from an administrator.',
        );
      }

      // 3. Cryptographically sign the server-side challenge locally
      const signature = await signLoginChallenge(userId, matchingCred.id, challenge);

      // 4. Submit verification payload to server
      const verifyData = await apiClient.post<{ user: User; accessToken: string }>(
        '/auth/webauthn/login/verify',
        {
          username,
          credentialId: matchingCred.id,
          signature,
        },
      );

      login(verifyData.user, verifyData.accessToken);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    if (!currentUserForPasskey) return;

    setError('');
    setPasskeyLoading(true);

    try {
      // 1. Fetch registration challenge options
      const options = await apiClient.post<{ challenge: string; userId: string }>(
        '/auth/webauthn/register/options',
      );

      // 2. Generate new biometric-bound keypair
      const { credentialId, publicKey } = await createUserPasskey(options.userId);

      // 3. Sign the challenge using the new private key
      const signature = await signLoginChallenge(options.userId, credentialId, options.challenge);

      // 4. Verify on the server
      await apiClient.post('/auth/webauthn/register/verify', {
        credentialId,
        publicKey,
        signature,
      });

      setPasskeySuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey registration failed');
    } finally {
      setPasskeyLoading(false);
    }
  };

  if (inviteVerifying) {
    return (
      <Flex align="center" justify="center" className={styles.page}>
        <Surface variant="glass" className={styles.card} style={{ textAlign: 'center' }}>
          <LqText as="h3" variant="h3" color="primary" className={styles.title}>
            Verifying Invitation...
          </LqText>
          <LqText as="p" color="muted" style={{ margin: 'var(--space-4) 0' }}>
            Securing your cryptographic handshake. Please hold...
          </LqText>
          <div
            className="spinner"
            style={{
              margin: 'var(--space-6) auto',
              width: '40px',
              height: '40px',
              border: '3px solid var(--glass-border)',
              borderTop: '3px solid var(--accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </Surface>
      </Flex>
    );
  }

  return (
    <Flex align="center" justify="center" className={styles.page}>
      <Surface variant="glass" className={styles.card}>
        <LqText as="h2" variant="h3" color="primary" className={styles.title}>
          Investigator Portal
        </LqText>

        {error && <Box className={styles.errorBanner}>{error}</Box>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Box>
            <LqText as="label" variant="small" color="muted" className={styles.label}>
              Username
            </LqText>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              required
            />
          </Box>

          <Box>
            <LqText as="label" variant="small" color="muted" className={styles.label}>
              Password
            </LqText>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />
          </Box>

          <Flex gap="var(--space-3)" style={{ width: '100%', marginTop: 'var(--space-2)' }}>
            <Button
              unstyled
              type="submit"
              disabled={loading}
              className={styles.submitButton}
              style={{ flex: 1 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <Button
              unstyled
              type="button"
              disabled={loading || !username.trim()}
              onClick={handlePasskeyLogin}
              className={styles.submitButton}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'none',
              }}
            >
              Sign In with Passkey
            </Button>
          </Flex>

          <div
            style={{
              margin: 'var(--space-3) 0',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            or
          </div>

          <Button
            unstyled
            type="button"
            disabled={loading}
            onClick={handleGuestLogin}
            className={styles.submitButton}
            style={{
              background: 'transparent',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              marginTop: 0,
            }}
          >
            Browse Public Archives (Read-Only)
          </Button>
        </form>
      </Surface>

      {/* Post-Invite Biometric Registration Modal Overlay */}
      {showPostInviteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <LqText
              as="h3"
              variant="h3"
              color="primary"
              style={{ textAlign: 'center', fontWeight: 'var(--weight-bold)' }}
            >
              🎉 Invitation Verified!
            </LqText>

            <LqText
              as="p"
              color="primary"
              style={{ textAlign: 'center', fontSize: '1.05rem', margin: 'var(--space-2) 0' }}
            >
              Welcome, <strong>{currentUserForPasskey?.username}</strong>. You have been
              successfully promoted to the role of <strong>Investigator</strong>.
            </LqText>

            <LqText
              as="p"
              color="muted"
              style={{ fontSize: '0.9rem', lineHeight: '1.5', textAlign: 'center' }}
            >
              To ensure passwordless biometric convenience and secure your account against local
              physical device interception, register this device as your personal Passkey.
            </LqText>

            {passkeySuccess ? (
              <Box
                style={{
                  padding: 'var(--space-4)',
                  border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 255, 128, 0.05)',
                  color: 'var(--accent-success)',
                  textAlign: 'center',
                  fontWeight: 'var(--weight-semibold)',
                  margin: 'var(--space-3) 0',
                }}
              >
                ✓ Passkey successfully registered on this device!
              </Box>
            ) : error ? (
              <Box className={styles.errorBanner} style={{ margin: 'var(--space-2) 0' }}>
                {error}
              </Box>
            ) : null}

            <div className={styles.modalActions}>
              {!passkeySuccess ? (
                <>
                  <Button
                    unstyled
                    type="button"
                    disabled={passkeyLoading}
                    onClick={() => {
                      setShowPostInviteModal(false);
                      navigate('/');
                    }}
                    style={{
                      padding: 'var(--space-2) var(--space-4)',
                      background: 'transparent',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-muted)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    Skip & Go to Dashboard
                  </Button>

                  <Button
                    unstyled
                    type="button"
                    disabled={passkeyLoading}
                    onClick={handleRegisterPasskey}
                    className={styles.submitButton}
                    style={{ width: 'auto', padding: 'var(--space-2) var(--space-5)' }}
                  >
                    {passkeyLoading ? 'Registering...' : 'Register Passkey'}
                  </Button>
                </>
              ) : (
                <Button
                  unstyled
                  type="button"
                  onClick={() => {
                    setShowPostInviteModal(false);
                    navigate('/');
                  }}
                  className={styles.submitButton}
                  style={{ width: 'auto', padding: 'var(--space-2) var(--space-6)' }}
                >
                  Enter Archive Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Flex>
  );
};
