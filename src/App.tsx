import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { LikesProvider } from "@/contexts/LikesContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import { Navigate } from "react-router-dom";
import RestaurantPublic from "./pages/RestaurantPublic.tsx";
import AdminRestaurants from "./pages/admin/AdminRestaurants.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import DashboardHome from "./pages/dashboard/DashboardHome.tsx";
import DashboardCategories from "./pages/dashboard/DashboardCategories.tsx";
import DashboardDishes from "./pages/dashboard/DashboardDishes.tsx";
import DashboardStats from "./pages/dashboard/DashboardStats.tsx";
import DashboardWaiters from "./pages/dashboard/DashboardWaiters.tsx";
import DashboardTables from "./pages/dashboard/DashboardTables.tsx";
import WaiterLogin from "./pages/waiter/WaiterLogin.tsx";
import WaiterHome from "./pages/waiter/WaiterHome.tsx";
import TableJoin from "./pages/m/TableJoin.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <LikesProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/r/:slug" element={<RestaurantPublic />} />
                <Route path="/login" element={<Login />} />
                {/* Public signup is disabled — admins create users from the panel */}
                <Route path="/signup" element={<Navigate to="/login" replace />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminRestaurants />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute requiredRoles={["owner", "admin"]}>
                      <DashboardHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/categorias"
                  element={
                    <ProtectedRoute requiredRoles={["owner", "admin"]}>
                      <DashboardCategories />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/platillos"
                  element={
                    <ProtectedRoute requiredRoles={["owner", "admin"]}>
                      <DashboardDishes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/estadisticas"
                  element={
                    <ProtectedRoute requiredRoles={["owner", "admin"]}>
                      <DashboardStats />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/meseros"
                  element={
                    <ProtectedRoute requiredRoles={["owner", "admin"]}>
                      <DashboardWaiters />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/mesas"
                  element={
                    <ProtectedRoute requiredRoles={["owner", "admin"]}>
                      <DashboardTables />
                    </ProtectedRoute>
                  }
                />
                <Route path="/mesero/login" element={<WaiterLogin />} />
                <Route path="/mesero" element={<WaiterHome />} />
                <Route path="/m/:code" element={<TableJoin />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </LikesProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
