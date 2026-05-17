import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Package, AlertTriangle, Download } from 'lucide-react';
import { reportsService } from '@/services/index';
import PageHeader from '@/components/ui/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';

const COLORS = ['#6366f1', '#818cf8', '#3b82f6', '#06b6d4', '#8b5cf6', '#a5b4fc', '#4f46e5'];

export default function ReportsPage() {
  const { data: salesChart } = useQuery({ queryKey: ['report-sales', 30], queryFn: () => reportsService.getSalesChart(30) });
  const { data: topProducts } = useQuery({ queryKey: ['report-top'], queryFn: () => reportsService.getTopProducts(10) });
  const { data: byCategory } = useQuery({ queryKey: ['report-category'], queryFn: reportsService.getSalesByCategory });
  const { data: production } = useQuery({ queryKey: ['report-production'], queryFn: () => reportsService.getProductionSummary(30) });
  const { data: lowStock } = useQuery({ queryKey: ['report-lowstock'], queryFn: reportsService.getLowStock });

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" subtitle="Análisis y estadísticas del negocio"
        actions={<button className="btn-secondary"><Download className="w-4 h-4" /> Exportar CSV</button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-500" /> Ventas últimos 30 días
          </h3>
          <p className="text-xs text-stone-500 mb-4">Ingresos diarios acumulados</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `Bs${v}`} />
              <Tooltip formatter={(v: any) => [formatCurrency(v), 'Ingresos']} labelFormatter={(l) => formatDate(l)} />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" /> Ventas por categoría
          </h3>
          <p className="text-xs text-stone-500 mb-4">Distribución de ingresos</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byCategory ?? []} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={85} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {(byCategory ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" /> Top 10 productos más vendidos
          </h3>
          <p className="text-xs text-stone-500 mb-4">Unidades vendidas</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topProducts ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="product.name" width={160} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => [v, 'Unidades']} />
              <Bar dataKey="_sum.quantity" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
            Estado de producción (30 días)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={production ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="_count.id" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Ingredientes con bajo stock
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {!lowStock?.length && <p className="text-stone-400 text-sm text-center py-8">No hay alertas de stock</p>}
            {lowStock?.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{i.name}</p>
                  <p className="text-xs text-stone-500">{i.unit} · Mín: {Number(i.minStock).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-600">{Number(i.stock).toFixed(2)} {i.unit}</p>
                  <p className="text-xs text-rose-500">Déficit: {Number(i.deficit).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
