
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <div className="min-h-screen bg-black">
                <Navigation />
                <main className="pt-16">
                  <Home />
                </main>
              </div>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <FullScreenChat />
              </ProtectedRoute>
            } />
            <Route path="/image" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-black">
                  <Navigation />
                  <main className="pt-16">
                    <ImageGeneration />
                  </main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/video" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-black">
                  <Navigation />
                  <main className="pt-16">
                    <VideoGeneration />
                  </main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/enhance" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-black">
                  <Navigation />
                  <main className="pt-16">
                    <Enhance />
                  </main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/account" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-black">
                  <Navigation />
                  <main className="pt-16">
                    <Account />
                  </main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/payment" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-black">
                  <Navigation />
                  <main className="pt-16">
                    <Payment />
                  </main>
                </div>
              </ProtectedRoute>
            } />
            {/* Legacy route redirect */}
            <Route path="/index" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-black">
                  <Navigation />
                  <main className="pt-16">
                    <Index />
                  </main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
