import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, ShoppingBag, Layers,
  Factory, DollarSign, FileText, Truck, BarChart3,
  UserCog, ChefHat, X, UtensilsCrossed, CreditCard,
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sales', icon: DollarSign, label: 'Ventas / POS' },
  { to: '/payments', icon: CreditCard, label: 'Cobros' },
  { to: '/orders', icon: ShoppingBag, label: 'Pedidos' },
  { to: '/production', icon: Factory, label: 'Producción' },
  { to: '/products', icon: Package, label: 'Productos' },
  { to: '/recipes', icon: ChefHat, label: 'Recetas' },
  { to: '/inventory', icon: Layers, label: 'Inventario' },
  { to: '/customers', icon: Users, label: 'Clientes' },
  { to: '/delivery', icon: Truck, label: 'Delivery' },
  { to: '/invoices', icon: FileText, label: 'Facturas' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/users', icon: UserCog, label: 'Usuarios' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 z-30 flex flex-col transition-transform duration-300 shadow-lg',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-stone-900 dark:text-white leading-tight">Bakery Pro</h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">Gestión Integral</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: '18px', height: '18px' }} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-stone-200 dark:border-stone-800">
          <p className="text-xs text-stone-400 dark:text-stone-600">Bakery Pro v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
