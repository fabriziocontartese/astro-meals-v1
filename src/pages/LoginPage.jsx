import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, Card, Container, Flex, Heading, Text, TextField, Callout } from '@radix-ui/themes';
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { useAuth } from '../auth/hooks/useAuth.js';

export default function LoginPage() {
  const { user, continueWithEmail, requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate('/profile', { replace: true });
    return null;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg(''); setLoading(true);
    try {
      await continueWithEmail(email, password);
      navigate('/profile', { replace: true });
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally { setLoading(false); }
  };

  const onReset = async () => {
    setErr(''); setMsg(''); 
    try {
      await requestPasswordReset(email, `${window.location.origin}/reset-password`);
      setMsg('Check your email for a password reset link.');
    } catch (e2) {
      setErr(e2.message || String(e2));
    }
  };

  return (
    <Container py="6" size="3">
      <Heading mb="4">Account</Heading>

      {err && (
        <Callout.Root color="red" mb="3">
          <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
          <Callout.Text>{err}</Callout.Text>
        </Callout.Root>
      )}
      {msg && (
        <Callout.Root color="green" mb="3">
          <Callout.Icon><CheckCircledIcon /></Callout.Icon>
          <Callout.Text>{msg}</Callout.Text>
        </Callout.Root>
      )}

      <Card size="3" style={{ maxWidth: 520 }}>
        <form onSubmit={onSubmit}>
          <Flex direction="column" gap="3">
            <Box>
              <Text>Email</Text>
              <TextField.Root type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" required />
            </Box>
            <Box>
              <Text>Password</Text>
              <TextField.Root type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="At least 8 characters" required />
            </Box>
            <Flex gap="3" align="center">
              <Button type="submit" disabled={loading || !email || !password}>{loading ? 'Working…' : 'Continue'}</Button>
              <Button type="button" variant="soft" disabled={!email} onClick={onReset}>Forgot password?</Button>
              <Text size="2" color="gray" ml="2"><Link to="/demo">Demo</Link></Text>
            </Flex>
          </Flex>
        </form>
      </Card>
    </Container>
  );
}
