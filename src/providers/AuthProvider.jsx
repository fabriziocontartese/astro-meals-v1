import { useEffect, useState } from "react";
import { AuthContext } from "../context/auth-context.js";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("astro_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const login = (u = { id: "demo", email: "demo@astro.me" }) => {
    setUser(u);
    localStorage.setItem("astro_user", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("astro_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
