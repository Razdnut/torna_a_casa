import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppMenu from "./components/AppMenu";
import Index from "./pages/Index";
import TrackerPage from "./pages/TrackerPage";
import CalendarPage from "./pages/CalendarPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-gray-100">
          <AppMenu />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tracker" element={<TrackerPage />} />
            <Route path="/tracker/:dayKey" element={<TrackerPage />} />
            <Route path="/calendario" element={<CalendarPage />} />
            <Route path="/archivio" element={<HistoryPage />} />
            <Route path="/impostazioni" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;