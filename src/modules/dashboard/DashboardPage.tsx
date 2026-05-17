import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, ShoppingBag, Factory, Users,
  Package, AlertTriangle, Truck, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { reportsService } from '@/services/index';
import StatsCard from '@/components/ui/StatsCard';
import PageHeader from '@/components/ui/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';

const COLORS = ['#6366f1', '#818cf8', '#3b82f6', '#06b6d4', '#8b5cf6', '#a5b4fc'];

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportsService.getDashboard,
    refetchInterval: 30000,
  });

  const { data: salesChart } = useQuery({
    queryKey: ['sales-chart'],
    queryFn: () => reportsService.getSalesChart(30),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products'],
    queryFn: () => reportsService.getTopProducts(5),
  });

  const { data: salesByCategory } = useQuery({
    queryKey: ['sales-by-category'],
    queryFn: reportsService.getSalesByCategory,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen operativo en tiempo real"
        actions={
          <span className="text-sm text-stone-400">
            {new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Ventas hoy" value={stats?.todaySales ?? 0} icon={ShoppingBag} color="primary"
          subtitle="Transacciones completadas" />
        <StatsCard title="Ingresos hoy" value={formatCurrency(stats?.todayRevenue ?? 0)} icon={DollarSign} color="green" />
        <StatsCard title="Ingresos del mes" value={formatCurrency(stats?.monthRevenue ?? 0)} icon={TrendingUp} color="blue" />
        <StatsCard title="Pedidos pendientes" value={stats?.pendingOrders ?? 0} icon={ShoppingBag} color="orange" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Producción activa" value={stats?.activeProductionOrders ?? 0} icon={Factory} color="purple" />
        <StatsCard title="Total clientes" value={stats?.totalCustomers ?? 0} icon={Users} color="blue" />
        <StatsCard title="Stock bajo" value={stats?.lowStockIngredients ?? 0} icon={AlertTriangle} color="red"
          subtitle="Ingredientes bajo mínimo" />
        <StatsCard title="Entregas pendientes" value={stats?.pendingDeliveries ?? 0} icon={Truck} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-4">Ventas últimos 30 días</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={salesChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Bs${v}`} />
              <Tooltip formatter={(v: any) => [formatCurrency(v), 'Ventas']} labelFormatter={(l) => formatDate(l)} />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-4">Ventas por categoría</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={salesByCategory ?? []} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {(salesByCategory ?? []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-4">Top 5 productos más vendidos</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={topProducts ?? []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="product.name" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => [v, 'Unidades']} />
            <Bar dataKey="_sum.quantity" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
