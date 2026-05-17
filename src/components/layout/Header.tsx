import { Menu, Moon, Sun, Bell, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { getInitials, ROLE_LABELS } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import toast from '@/lib/toast';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar, toggleDarkMode, darkMode } = useUIStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      logout();
      navigate('/login');
      toast.success('Sesión cerrada');
    }
  };

  const handleProfile = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  return (
    <header className="h-16 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between px-6 shrink-0 shadow-sm">
      <button onClick={toggleSidebar} className="btn-ghost p-2 rounded-lg">
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-3">
        <button onClick={toggleDarkMode} className="btn-ghost p-2 rounded-lg" title="Cambiar tema">
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="btn-ghost p-2 rounded-lg relative" title="Notificaciones">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.firstName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user ? getInitials(user.firstName, user.lastName) : 'U'}
              </div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200 leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-tight">
                {user?.role ? (ROLE_LABELS[user.role] ?? user.role) : ''}
              </p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 w-52 card shadow-xl z-50 py-1 animate-slide-in">
              <div className="px-4 py-2.5 border-b border-stone-100 dark:border-stone-800">
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-stone-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleProfile}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <User className="w-4 h-4" /> Mi perfil
              </button>
              <hr className="my-1 border-stone-200 dark:border-stone-700" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
