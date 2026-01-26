import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ApiProvider } from "./lib/apiprovider";
import Overview from "./pages/Overview";
import LiveTrends from "./pages/LiveTrends";
import DemandForecast from "./pages/DemandForecast";
import AIDecisions from "./pages/AIDecisions";
import PurchaseOrders from "./pages/PurchaseOrders";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ApiProvider>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/live-trends" element={<LiveTrends />} />
          <Route path="/demand-forecast" element={<DemandForecast />} />
          <Route path="/ai-decisions" element={<AIDecisions />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </ApiProvider>
  </QueryClientProvider>
);

export default App;
