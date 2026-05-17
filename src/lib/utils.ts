import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: es });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmado', IN_PRODUCTION: 'En producción',
  READY: 'Listo', ON_ROUTE: 'En camino', PAID: 'Pagado', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  IN_PRODUCTION: 'bg-purple-100 text-purple-700',
  READY: 'bg-teal-100 text-teal-700',
  ON_ROUTE: 'bg-orange-100 text-orange-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', PREPARING: 'Preparando', DECORATING: 'Decorando', FINISHED: 'Finalizado',
};

export const PRODUCTION_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PREPARING: 'bg-blue-100 text-blue-700',
  DECORATING: 'bg-purple-100 text-purple-700',
  FINISHED: 'bg-green-100 text-green-700',
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', ASSIGNED: 'Asignado', IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregado', FAILED: 'Fallido',
};

export const ORDER_TYPE_LABELS: Record<string, string> = {
  DELIVERY: 'Envío a domicilio',
  PICKUP: 'Recojo en tienda',
};

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  PRE_PAYMENT: 'Pago anticipado',
  ON_DELIVERY: 'Pago contra entrega',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo', QR: 'QR', CARD: 'Tarjeta', TRANSFER: 'Transferencia',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador', CASHIER: 'Cajero', BAKER: 'Pastelero',
  DELIVERY: 'Delivery', SUPERVISOR: 'Supervisor',
};

export function getApiError(err: any): string {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg[0];
  if (typeof msg === 'string') return msg;
  return 'Error al procesar la solicitud';
}
