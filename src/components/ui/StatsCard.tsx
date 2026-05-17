import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'red' | 'purple';
}

const colorMap = {
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  red: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
};

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }: StatsCardProps) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl', colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', trend.value >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20')}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-stone-900 dark:text-white">{value}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
