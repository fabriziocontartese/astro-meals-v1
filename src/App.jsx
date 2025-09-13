import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import AuthProviders from "./providers/AuthProvider.jsx";
import { useAuth } from "./hooks/useAuth.js";

import NavBar from "./components/NavBar.jsx";
import Footer from "./components/Footer.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import DemoPage from "./pages/DemoPage.jsx";
import PlanPage from "./pages/PlanPage.jsx";
import RecipesPage from "./pages/RecipesPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}
function RequireGuest({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/plan" replace /> : children;
}

export default function App() {
  return (
    <AuthProviders>
      <BrowserRouter>
        <NavBar />
        <main>
          <Routes>
            <Route path="/" element={<RequireGuest><LandingPage /></RequireGuest>} />
            <Route path="/demo" element={<RequireGuest><DemoPage /></RequireGuest>} />
            <Route path="/plan" element={<RequireAuth><PlanPage /></RequireAuth>} />
            <Route path="/recipes" element={<RequireAuth><RecipesPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProviders>
  );
}
