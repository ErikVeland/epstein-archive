import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Surface } from '../design-system/components/surfaces/Surface';
import { Flex } from '../design-system/components/layout/Flex';
import { Box } from '../design-system/components/layout/Box';
import { LqText } from '../design-system/components/typography/Text';

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
    <Flex align="center" justify="center" className="min-h-[calc(100vh-200px)] p-4">
      <Surface variant="glass" className="w-full max-w-md p-8 shadow-xl">
        <LqText as="h2" variant="h3" color="primary" className="mb-6 text-center font-bold">
          Admin Login
        </LqText>

        {error && (
          <Box className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded mb-4 text-sm">
            {error}
          </Box>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Box>
            <LqText as="label" variant="small" color="muted" className="block mb-1 font-medium">
              Username
            </LqText>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded px-3 py-2 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
              required
            />
          </Box>

          <Box>
            <LqText as="label" variant="small" color="muted" className="block mb-1 font-medium">
              Password
            </LqText>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded px-3 py-2 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
              required
            />
          </Box>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] hover:brightness-110 text-[var(--text-primary)] font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent)]/20"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </Surface>
    </Flex>
  );
};
