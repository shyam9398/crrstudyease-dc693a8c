import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import CollegesHub from "./pages/CollegesHub";
import CollegeLogin from "./pages/CollegeLogin";
import StudentLogin from "./pages/StudentLogin";
import CreateCollege from "./pages/CreateCollege";
import Explore from "./pages/Explore";
import Dashboard from "./pages/Dashboard";
import SubjectPage from "./pages/SubjectPage";
import ModulePage from "./pages/ModulePage";
import StudentDashboard from "./pages/StudentDashboard";
import StudentSubjectPage from "./pages/StudentSubjectPage";
import StudentModulePage from "./pages/StudentModulePage";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/colleges" element={<CollegesHub />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/create-college" element={<CreateCollege />} />
      <Route path="/college-login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <CollegeLogin />} />
      <Route path="/student-login" element={<StudentLogin />} />
      <Route path="/legacy-login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subject/:id"
        element={
          <ProtectedRoute>
            <SubjectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subject/:id/unit/:unitId/module/:moduleId"
        element={
          <ProtectedRoute>
            <ModulePage />
          </ProtectedRoute>
        }
      />
      {/* Student routes (no auth required) */}
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/subject/:id" element={<StudentSubjectPage />} />
      <Route path="/student/subject/:id/unit/:unitId/module/:moduleId" element={<StudentModulePage />} />
      {/* Admin route */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ThemeProvider defaultTheme="system">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
