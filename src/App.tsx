

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import FullScreenChat from "./pages/FullScreenChat";
import ImageGeneration from "./pages/ImageGeneration";
import VideoGeneration from "./pages/VideoGeneration";
import Enhance from "./pages/Enhance";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Payment from "./pages/Payment";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-white">
              <Navigation />
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/account" element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                } />
                <Route path="/chat" element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                } />
                <Route path="/chat/:sessionId" element={
                  <ProtectedRoute>
                    <FullScreenChat />
                  </ProtectedRoute>
                } />
                <Route path="/image" element={
                  <ProtectedRoute>
                    <ImageGeneration />
                  </ProtectedRoute>
                } />
                <Route path="/image-generation" element={
                  <ProtectedRoute>
                    <ImageGeneration />
                  </ProtectedRoute>
                } />
                <Route path="/video-generation" element={
                  <ProtectedRoute>
                    <VideoGeneration />
                  </ProtectedRoute>
                } />
                <Route path="/enhance" element={
                  <ProtectedRoute>
                    <Enhance />
                  </ProtectedRoute>
                } />
                <Route path="/payment" element={
                  <ProtectedRoute>
                    <Payment />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

