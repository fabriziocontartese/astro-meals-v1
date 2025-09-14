import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import AuthProviders from './providers/AuthProvider.jsx';
import { useAuth } from './auth/hooks/useAuth.js';

import NavBar from './components/NavBar.jsx';
import Footer from './components/Footer.jsx';
import LandingPage from './pages/LandingPage.jsx';
import PlanPage from './pages/PlanPage.jsx';
import RecipesPage from './pages/RecipesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DemoPage from './pages/DemoPage.jsx';
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";


function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function RequireGuest({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? <Navigate to="/profile" replace /> : children;
}

export default function App() {
  return (
    <AuthProviders>
      <BrowserRouter>
        <NavBar />
        <main>
          <Routes>
            <Route path="/" element={<RequireGuest><LandingPage /></RequireGuest>} />
            <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
            <Route path="/demo" element={<RequireGuest><DemoPage /></RequireGuest>} />
            <Route path="/plan" element={<RequireAuth><PlanPage /></RequireAuth>} />
            <Route path="/recipes" element={<RequireAuth><RecipesPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProviders>
  );
}
