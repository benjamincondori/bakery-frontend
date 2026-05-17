import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      darkMode: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleDarkMode: () => {
        set((s) => {
          const newDark = !s.darkMode;
          if (newDark) document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          return { darkMode: newDark };
        });
      },
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'bakery-ui', partialize: (state) => ({ darkMode: state.darkMode, sidebarOpen: state.sidebarOpen }) },
  ),
);
