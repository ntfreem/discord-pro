import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
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
import "@/App.css";

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="knowledge" element={<KnowledgeBase />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="settings" element={<BotSettings />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="discord" element={<DiscordSettings />} />
            <Route path="embed" element={<EmbedCode />} />
          </Route>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/widget" element={<ChatWidget />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
