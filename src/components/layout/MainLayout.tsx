import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';

export default function MainLayout() {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="flex h-screen bg-stone-50 dark:bg-stone-950 overflow-hidden">
      <Sidebar />
      <div className={cn(
        'flex flex-col flex-1 overflow-hidden transition-all duration-300',
        sidebarOpen ? 'md:ml-64' : 'ml-0',
      )}>
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
