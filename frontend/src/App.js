import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import Dashboard from "@/pages/Dashboard";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Conversations from "@/pages/Conversations";
import BotSettings from "@/pages/BotSettings";
import Analytics from "@/pages/Analytics";
import DiscordSettings from "@/pages/DiscordSettings";
import EmbedCode from "@/pages/EmbedCode";
import ChatPage from "@/pages/ChatPage";
import ChatWidget from "@/pages/ChatWidget";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import InstanceSelect from "@/pages/InstanceSelect";
import Instances from "@/pages/Instances";
import "@/App.css";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === "superadmin" ? children : <Navigate to="/admin" replace />;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/admin" replace />;
}

function AppRoutes() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <Routes>
      {/* Public auth pages */}
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/select-instance" element={<ProtectedRoute><InstanceSelect /></ProtectedRoute>} />

      {/* Admin area */}
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="settings" element={<BotSettings />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="discord" element={<DiscordSettings />} />
        <Route path="embed" element={<EmbedCode />} />
        <Route path="instances" element={<AdminOnlyRoute><Instances /></AdminOnlyRoute>} />
      </Route>

      {/* Public chat pages */}
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/widget" element={<ChatWidget />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
