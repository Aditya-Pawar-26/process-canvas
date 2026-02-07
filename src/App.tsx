import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Scenarios from "./pages/Scenarios";
import DSATree from "./pages/DSATree";
import Theory from "./pages/Theory";
import Help from "./pages/Help";
import CodeEditor from "./pages/CodeEditor";
import GuidedMode from "./pages/GuidedMode";
import Quiz from "./pages/Quiz";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/dsa-tree" element={<DSATree />} />
          <Route path="/code-editor" element={<CodeEditor />} />
          <Route path="/guided" element={<GuidedMode />} />
          <Route path="/theory" element={<Theory />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
