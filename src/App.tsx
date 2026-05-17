import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import MainLayout from '@/components/layout/MainLayout';
import LoginPage from '@/modules/auth/LoginPage';
import DashboardPage from '@/modules/dashboard/DashboardPage';
import ProductsPage from '@/modules/products/ProductsPage';
import CustomersPage from '@/modules/customers/CustomersPage';
import OrdersPage from '@/modules/orders/OrdersPage';
import InventoryPage from '@/modules/inventory/InventoryPage';
import ProductionPage from '@/modules/production/ProductionPage';
import SalesPage from '@/modules/sales/SalesPage';
import PaymentsPage from '@/modules/payments/PaymentsPage';
import InvoicesPage from '@/modules/invoices/InvoicesPage';
import DeliveryPage from '@/modules/delivery/DeliveryPage';
import ReportsPage from '@/modules/reports/ReportsPage';
import UsersPage from '@/modules/users/UsersPage';
import RecipesPage from '@/modules/recipes/RecipesPage';
import ProfilePage from '@/modules/profile/ProfilePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const { darkMode } = useUIStore();

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="production" element={<ProductionPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="delivery" element={<DeliveryPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
