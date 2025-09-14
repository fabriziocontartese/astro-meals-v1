import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Container, Flex, Heading, Text, TextField, Callout } from '@radix-ui/themes';
import { useAuth } from '../auth/hooks/useAuth.js';

export default function ResetPasswordPage() {
  const { setNewPassword } = useAuth();
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      await setNewPassword(pwd);
      setMsg('Password updated. You can now use it to sign in.');
      setTimeout(()=>navigate('/login', { replace: true }), 800);
    } catch (e2) { setErr(e2.message || String(e2)); }
  };

  return (
    <Container py="6" size="3">
      <Heading mb="4">Set a new password</Heading>
      {err && <Callout.Root color="red" mb="3"><Callout.Text>{err}</Callout.Text></Callout.Root>}
      {msg && <Callout.Root color="green" mb="3"><Callout.Text>{msg}</Callout.Text></Callout.Root>}
      <Card size="3" style={{ maxWidth: 480 }}>
        <form onSubmit={submit}>
          <Flex direction="column" gap="3">
            <Text>New password</Text>
            <TextField.Root type="password" value={pwd} onChange={(e)=>setPwd(e.target.value)} placeholder="At least 8 characters" required />
            <Button type="submit">Update password</Button>
          </Flex>
        </form>
      </Card>
    </Container>
  );
}
