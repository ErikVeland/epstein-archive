import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Surface } from '../design-system/components/surfaces/Surface';
import { Flex } from '../design-system/components/layout/Flex';
import { Box } from '../design-system/components/layout/Box';
import { LqText } from '../design-system/components/typography/Text';
import styles from './LoginPage.module.css';

import { Button, Input } from '../design-system/lib';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

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

  return (
    <Flex align="center" justify="center" className={styles.page}>
      <Surface variant="glass" className={styles.card}>
        <LqText as="h2" variant="h3" color="primary" className={styles.title}>
          Admin Login
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
              required
            />
          </Box>

          <Button unstyled type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Surface>
    </Flex>
  );
};
