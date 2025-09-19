import { Link, useNavigate } from 'react-router-dom';
import { Box, Container, Flex, Button, Text } from '@radix-ui/themes';
import { PersonIcon } from '@radix-ui/react-icons';
import { useAuth } from '../auth/hooks/useAuth.js';
import logo from '../../public/logos/ASTRO logo final - black transparent.png';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Box asChild className="navbar">
      <header>
        <Container>
          <Flex justify="between" align="center" py="3">
            <Link to="/">
              <img src={logo} alt="ASTRO Meals" style={{ height: 50, display: 'block' }} />
            </Link>

            {user ? (
              <Flex gap="3" align="center">
                {user.email && <Text color="gray" size="2">{user.email}</Text>}
                <Button variant="soft" asChild><Link to="/plan">Plan</Link></Button>
                <Button variant="soft" asChild><Link to="/recipes">Recipes</Link></Button>
                <Button variant="soft" asChild><Link to="/profile"><PersonIcon /> Profile</Link></Button>
                <Button variant="solid" onClick={handleLogout}>Log out</Button>
              </Flex>
            ) : (
              <Flex gap="3" align="center">
                <Button variant="soft" asChild><Link to="/demo">Demo</Link></Button>
                <Button variant="solid" asChild><Link to="/login">Log in</Link></Button>
              </Flex>
            )}
          </Flex>
        </Container>
      </header>
    </Box>
  );
}
