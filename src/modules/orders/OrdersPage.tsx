import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Eye, X, Trash2,
  Clock, CheckCircle, Package, Star, CreditCard, Truck, Store,
  ChevronRight, AlertCircle, MapPin, FileText, User, Image, Info, Navigation,
} from 'lucide-react';
import { ordersService, customersService } from '@/services/index';
import { productsService } from '@/services/products.service';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Badge from '@/components/ui/Badge';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  formatCurrency, formatDate,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  PRODUCTION_STATUS_LABELS, PRODUCTION_STATUS_COLORS,
  ORDER_TYPE_LABELS, PAYMENT_MODE_LABELS,
  getApiError,
} from '@/lib/utils';
import type { Order, OrderStatus, OrderType, PaymentMode, Product } from '@/types';
import toast from '@/lib/toast';
import { cn } from '@/lib/utils';

// ─── Status flow ─────────────────────────────────────────────────────────────
const STATUS_FLOW_PICKUP: OrderStatus[] = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'PAID', 'DELIVERED'];
const STATUS_FLOW_DELIVERY_ON_DELIVERY: OrderStatus[] = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'ON_ROUTE', 'PAID', 'DELIVERED'];
const STATUS_FLOW_DELIVERY_PRE_PAYMENT: OrderStatus[] = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'PAID', 'ON_ROUTE', 'DELIVERED'];
const ALL_STATUSES: OrderStatus[] = [...STATUS_FLOW_PICKUP, 'ON_ROUTE', 'CANCELLED'];

const STATUS_ICONS: Record<OrderStatus, any> = {
  PENDING: Clock, CONFIRMED: CheckCircle, IN_PRODUCTION: Package,
  READY: Star, ON_ROUTE: Navigation, PAID: CreditCard, DELIVERED: Truck, CANCELLED: AlertCircle,
};

function getStatusFlow(order: Order): OrderStatus[] {
  if (order.orderType !== 'DELIVERY') return STATUS_FLOW_PICKUP;
  return order.paymentMode === 'ON_DELIVERY' ? STATUS_FLOW_DELIVERY_ON_DELIVERY : STATUS_FLOW_DELIVERY_PRE_PAYMENT;
}

// Transiciones manuales posibles.
// CONFIRMED→IN_PRODUCTION y IN_PRODUCTION→READY son automáticas (módulo de Producción).
// READY→PAID es automática al registrar cobro en módulo Cobros.
// PAID→DELIVERED es manual solo para PICKUP; DELIVERY usa módulo Delivery.
function getNextStatus(order: Order): { status: OrderStatus; label: string } | null {
  if (order.status === 'PENDING') return { status: 'CONFIRMED', label: 'Confirmar pedido' };
  if (order.status === 'PAID' && order.orderType !== 'DELIVERY') return { status: 'DELIVERED', label: 'Marcar como entregado' };
  return null;
}

// ─── Status Stepper ───────────────────────────────────────────────────────────
function StatusStepper({ order }: { order: Order }) {
  const { status } = order;
  const isCancelled = status === 'CANCELLED';
  const flow = getStatusFlow(order);
  const currentIdx = flow.indexOf(status);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-red-600 dark:text-red-400">Pedido cancelado</span>
      </div>
    );
  }

  return (
    <div className="flex items-start w-full gap-0">
      {flow.map((s, i) => {
        const Icon = STATUS_ICONS[s];
        const isAllDone = status === 'DELIVERED';
        const isDone = i < currentIdx || (isAllDone && i === currentIdx);
        const isCurrent = !isAllDone && i === currentIdx;
        const isFuture = i > currentIdx;

        return (
          <div key={s} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                isDone && 'bg-green-500 text-white',
                isCurrent && 'bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900',
                isFuture && 'bg-stone-200 dark:bg-stone-700 text-stone-400',
              )}>
                {isDone
                  ? <CheckCircle className="w-4 h-4" />
                  : <Icon className="w-4 h-4" />
                }
              </div>
              <span className={cn(
                'text-xs mt-1.5 font-medium text-center leading-tight px-0.5',
                isDone && 'text-green-600 dark:text-green-400',
                isCurrent && 'text-primary-600 dark:text-primary-400',
                isFuture && 'text-stone-400',
              )}>
                {ORDER_STATUS_LABELS[s]}
              </span>
            </div>
            {i < flow.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mt-4 mx-1',
                i < currentIdx ? 'bg-green-400' : 'bg-stone-200 dark:bg-stone-700',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────
interface OrderDetailViewProps {
  orderId: string;
  onClose: () => void;
  onCancel: (order: any) => void;
}

function OrderDetailView({ orderId, onClose, onCancel }: OrderDetailViewProps) {
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersService.getOne(orderId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      ordersService.updateStatus(orderId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Estado actualizado correctamente');
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  if (isLoading || !order) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const next = getNextStatus(order);
  const canCancel = order.status !== 'CANCELLED' && order.status !== 'DELIVERED';

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-4">
          Progreso del pedido
        </p>
        <StatusStepper order={order} />
      </div>

      {/* Reference image for custom orders */}
      {order.imageUrl && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
            <Image className="w-3.5 h-3.5" />
            Imagen de referencia
          </p>
          <img
            src={order.imageUrl}
            alt="Referencia del pedido"
            className="rounded-xl border border-stone-200 dark:border-stone-700 w-full object-contain max-h-56 bg-stone-50 dark:bg-stone-800"
          />
        </div>
      )}

      {/* Main info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          <p className="text-xs text-stone-500 mb-0.5">Cliente</p>
          <p className="font-semibold">{order.customer?.firstName} {order.customer?.lastName}</p>
          {order.customer?.phone && <p className="text-xs text-stone-400">{order.customer.phone}</p>}
        </div>
        <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          <p className="text-xs text-stone-500 mb-0.5">Fecha de entrega</p>
          <p className="font-semibold">{formatDate(order.deliveryDate)}</p>
          <p className="text-xs text-stone-400">Creado: {formatDate(order.createdAt)}</p>
        </div>
        <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          <p className="text-xs text-stone-500 mb-0.5">Total</p>
          <p className="font-bold text-lg text-primary-600">{formatCurrency(order.totalAmount)}</p>
        </div>
        <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          <p className="text-xs text-stone-500 mb-0.5">Tipo</p>
          <Badge variant={order.isCustom ? 'purple' : 'default'}>
            {order.isCustom ? 'Personalizado' : 'Estándar'}
          </Badge>
        </div>
      </div>

      {/* Address & Notes */}
      {(order.deliveryAddress || order.notes) && (
        <div className="space-y-2">
          {order.deliveryAddress && (
            <div className="flex items-start gap-2 text-sm p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-300">Dirección de entrega</p>
                <p className="text-blue-600 dark:text-blue-400">{order.deliveryAddress}</p>
              </div>
            </div>
          )}
          {order.notes && (
            <div className="flex items-start gap-2 text-sm p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <FileText className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Notas</p>
                <p className="text-amber-600 dark:text-amber-400">{order.notes}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
          Productos del pedido
        </p>
        <div className="space-y-1.5">
          {order.orderDetails?.map((d: any) => (
            <div
              key={d.id}
              className="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-stone-800 rounded-lg text-sm"
            >
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-stone-400" />
                <span className="font-medium">{d.product?.name}</span>
                <span className="text-stone-400">× {d.quantity}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">{formatCurrency(d.subtotal)}</span>
                <span className="text-xs text-stone-400 ml-1">({formatCurrency(d.unitPrice)} c/u)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production orders */}
      {order.productionOrders?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Órdenes de producción
          </p>
          <div className="space-y-1.5">
            {order.productionOrders.map((po: any) => (
              <div
                key={po.id}
                className="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-stone-800 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-stone-400">{po.orderNumber}</span>
                  <span className="font-medium">{po.recipe?.product?.name}</span>
                  <span className="text-stone-400">× {po.quantity}</span>
                </div>
                <div className="flex items-center gap-2">
                  {po.assignee && (
                    <div className="flex items-center gap-1 text-xs text-stone-500">
                      <User className="w-3 h-3" />
                      {po.assignee.firstName}
                    </div>
                  )}
                  <span className={cn('badge text-xs', PRODUCTION_STATUS_COLORS[po.status])}>
                    {PRODUCTION_STATUS_LABELS[po.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery */}
      {order.delivery && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Delivery
          </p>
          <div className="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-stone-800 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-stone-400" />
              {order.delivery.driver
                ? <span>{order.delivery.driver.firstName} {order.delivery.driver.lastName}</span>
                : <span className="text-stone-400 italic">Sin asignar</span>
              }
            </div>
            <span className="text-xs text-stone-500">{order.delivery.address}</span>
          </div>
        </div>
      )}

      {/* Info banners for automatic states */}
      {order.status === 'CONFIRMED' && (
        <div className="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm border border-blue-100 dark:border-blue-800">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-800 dark:text-blue-300">Siguiente paso: Producción</p>
            <p className="text-blue-600 dark:text-blue-400 text-xs mt-0.5">
              Ve al módulo de <strong>Producción</strong>, crea una orden y vincúlala a este pedido. El estado avanzará a <strong>En producción</strong> automáticamente.
            </p>
          </div>
        </div>
      )}
      {order.status === 'IN_PRODUCTION' && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm border border-amber-100 dark:border-amber-800">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">En producción</p>
            <p className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">
              El pedido pasará a <strong>Listo</strong> automáticamente cuando todas las órdenes de producción vinculadas hayan finalizado.
              {order.orderType === 'DELIVERY' && ' Al finalizar, se creará el registro de entrega automáticamente.'}
            </p>
          </div>
        </div>
      )}
      {order.status === 'READY' && order.orderType !== 'DELIVERY' && (
        <div className="flex items-start gap-2.5 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-sm border border-teal-100 dark:border-teal-800">
          <Info className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-teal-800 dark:text-teal-300">Siguiente paso: Cobro</p>
            <p className="text-teal-600 dark:text-teal-400 text-xs mt-0.5">
              Ve al módulo de <strong>Cobros</strong> y registra el pago. El estado avanzará a <strong>Pagado</strong> automáticamente.
            </p>
          </div>
        </div>
      )}
      {order.status === 'READY' && order.orderType === 'DELIVERY' && order.paymentMode === 'PRE_PAYMENT' && (
        <div className="flex items-start gap-2.5 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-sm border border-teal-100 dark:border-teal-800">
          <Info className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-teal-800 dark:text-teal-300">Siguiente paso: Cobro anticipado</p>
            <p className="text-teal-600 dark:text-teal-400 text-xs mt-0.5">
              El registro de entrega fue creado. Ve al módulo de <strong>Cobros</strong> para registrar el pago. Una vez pagado, podrás asignar el repartidor desde el módulo de <strong>Delivery</strong>.
            </p>
          </div>
        </div>
      )}
      {order.status === 'READY' && order.orderType === 'DELIVERY' && order.paymentMode === 'ON_DELIVERY' && (
        <div className="flex items-start gap-2.5 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-sm border border-teal-100 dark:border-teal-800">
          <Truck className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-teal-800 dark:text-teal-300">Siguiente paso: Asignar repartidor</p>
            <p className="text-teal-600 dark:text-teal-400 text-xs mt-0.5">
              El registro de entrega fue creado. Ve al módulo de <strong>Delivery</strong> para asignar el repartidor. El cobro se registrará al momento de la entrega.
            </p>
          </div>
        </div>
      )}
      {order.status === 'ON_ROUTE' && (
        <div className="flex items-start gap-2.5 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm border border-orange-100 dark:border-orange-800">
          <Navigation className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-orange-800 dark:text-orange-300">Pedido en camino</p>
            <p className="text-orange-600 dark:text-orange-400 text-xs mt-0.5">
              El repartidor ya fue asignado y está llevando el pedido.
              {order.paymentMode === 'ON_DELIVERY'
                ? ' El cobro se registrará al momento de la entrega desde el módulo de Delivery.'
                : ' El pedido se marcará como entregado automáticamente al completar la entrega.'}
            </p>
          </div>
        </div>
      )}
      {order.status === 'PAID' && order.orderType === 'DELIVERY' && order.paymentMode === 'PRE_PAYMENT' && (
        <div className="flex items-start gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm border border-emerald-100 dark:border-emerald-800">
          <Truck className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">Pago registrado — Asignar repartidor</p>
            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
              Ve al módulo de <strong>Delivery</strong> para asignar el repartidor. El pedido pasará a <strong>En camino</strong> automáticamente al asignarlo.
            </p>
          </div>
        </div>
      )}
      {order.status === 'PAID' && order.orderType !== 'DELIVERY' && (
        <div className="flex items-start gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm border border-emerald-100 dark:border-emerald-800">
          <Info className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">Pago registrado</p>
            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
              Recogida en tienda: usa el botón <strong>"Marcar como entregado"</strong> cuando el cliente retire su pedido.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-stone-200 dark:border-stone-700">
        {canCancel && (
          <button
            onClick={() => onCancel(order)}
            className="btn-ghost text-sm text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          >
            <X className="w-4 h-4" />
            Cancelar pedido
          </button>
        )}
        <div className="flex-1" />
        <button onClick={onClose} className="btn-secondary text-sm">
          Cerrar
        </button>
        {next && (
          <button
            onClick={() => statusMutation.mutate({ status: next.status })}
            disabled={statusMutation.isPending}
            className="btn-primary text-sm"
          >
            {statusMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Actualizando...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                {next.label}
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Order Form ───────────────────────────────────────────────────────────────
interface OrderDetailForm {
  productId: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

const emptyForm = () => ({
  customerId: '',
  deliveryDate: '',
  notes: '',
  imageUrl: undefined as string | undefined,
  isCustom: false,
  orderType: 'PICKUP' as OrderType,
  paymentMode: 'PRE_PAYMENT' as PaymentMode,
  deliveryAddress: '',
  details: [] as OrderDetailForm[],
});

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [form, setForm] = useState(emptyForm());

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, limit, search, statusFilter],
    queryFn: () =>
      ordersService.getAll({ page, limit, search, status: statusFilter || undefined }),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customersService.getAll({ limit: 100 }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsService.getAll({ limit: 100 }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => ordersService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (cancelingOrder) qc.invalidateQueries({ queryKey: ['order', cancelingOrder.id] });
      toast.success('Pedido cancelado');
      setCancelingOrder(null);
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => ordersService.create(data),
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pedido creado exitosamente');
      setModalOpen(false);
      setForm(emptyForm());
      setViewOrderId(created.id);
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const products: Product[] = (productsData as any)?.data ?? [];
  const customersList: any[] = (customers as any)?.data ?? [];

  const addDetail = () =>
    setForm(f => ({
      ...f,
      details: [...f.details, { productId: '', quantity: 1, unitPrice: 0, notes: '' }],
    }));

  const removeDetail = (i: number) =>
    setForm(f => ({ ...f, details: f.details.filter((_, idx) => idx !== i) }));

  const updateDetail = (i: number, field: keyof OrderDetailForm, value: string | number) => {
    setForm(f => {
      const details = [...f.details];
      details[i] = { ...details[i], [field]: value };
      if (field === 'productId') {
        const p = products.find(p => p.id === value);
        if (p) details[i].unitPrice = p.price;
      }
      return { ...f, details };
    });
  };

  const total = form.details.reduce((s, d) => s + d.quantity * d.unitPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId) return toast.error('Selecciona un cliente');
    if (!form.deliveryDate) return toast.error('Ingresa la fecha de entrega');
    if (form.orderType === 'DELIVERY' && !form.deliveryAddress.trim())
      return toast.error('La dirección de entrega es requerida para envíos a domicilio');
    if (form.details.length === 0) return toast.error('Agrega al menos un producto');
    if (form.details.some(d => !d.productId))
      return toast.error('Selecciona el producto en todos los detalles');
    createMutation.mutate(form);
  };

  const columns = [
    {
      key: 'orderNumber',
      header: 'N° Pedido',
      render: (o: Order) => (
        <span className="font-mono text-sm font-semibold text-primary-600">{o.orderNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (o: Order) => (
        <div>
          <p className="font-medium">{o.customer?.firstName} {o.customer?.lastName}</p>
          <p className="text-xs text-stone-500">{o.customer?.phone}</p>
        </div>
      ),
    },
    {
      key: 'deliveryDate',
      header: 'Entrega',
      render: (o: Order) => formatDate(o.deliveryDate),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (o: Order) => (
        <span className="font-semibold">{formatCurrency(o.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (o: Order) => (
        <span className={cn('badge', ORDER_STATUS_COLORS[o.status])}>
          {ORDER_STATUS_LABELS[o.status]}
        </span>
      ),
    },
    {
      key: 'isCustom',
      header: 'Tipo',
      render: (o: Order) => (
        <div className="flex flex-col gap-1">
          <Badge variant={o.isCustom ? 'purple' : 'default'}>
            {o.isCustom ? 'Personalizado' : 'Estándar'}
          </Badge>
          {o.orderType === 'DELIVERY' ? (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <Truck className="w-3 h-3" /> Envío
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-stone-500 font-medium">
              <Store className="w-3 h-3" /> Tienda
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (o: Order) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => setViewOrderId(o.id)}
            className="btn-ghost p-1.5 text-stone-500 hover:text-primary-600"
            title="Ver detalles"
          >
            <Eye className="w-4 h-4" />
          </button>
          {o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
            <button
              onClick={() => setCancelingOrder(o)}
              className="btn-ghost p-1.5 text-stone-500 hover:text-rose-600"
              title="Cancelar pedido"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        subtitle={`${data?.meta?.total ?? 0} pedidos registrados`}
        actions={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> Nuevo pedido
          </button>
        }
      />

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9"
            placeholder="Buscar por número de pedido..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input max-w-xs"
        >
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        emptyMessage="No hay pedidos registrados"
      />

      {/* Order Detail Modal */}
      {viewOrderId && (
        <Modal
          isOpen={!!viewOrderId}
          onClose={() => setViewOrderId(null)}
          title="Detalle del pedido"
          size="lg"
        >
          <OrderDetailView
            orderId={viewOrderId}
            onClose={() => setViewOrderId(null)}
            onCancel={(order) => {
              setCancelingOrder(order);
            }}
          />
        </Modal>
      )}

      {/* Cancel Confirm */}
      <ConfirmModal
        isOpen={!!cancelingOrder}
        onClose={() => setCancelingOrder(null)}
        onConfirm={() => cancelingOrder && cancelMutation.mutate(cancelingOrder.id)}
        title="¿Cancelar pedido?"
        description={`Se cancelará el pedido ${cancelingOrder?.orderNumber} de ${cancelingOrder?.customer?.firstName} ${cancelingOrder?.customer?.lastName}. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cancelar"
        variant="warning"
        loading={cancelMutation.isPending}
      />

      {/* New Order Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setForm(emptyForm()); }}
        title="Nuevo pedido"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Cliente *</label>
              <select
                className="input"
                value={form.customerId}
                onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
              >
                <option value="">Seleccionar cliente...</option>
                {customersList.map(c => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.phone}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fecha de entrega *</label>
              <input
                type="date"
                className="input"
                value={form.deliveryDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))}
              />
            </div>

            {/* Tipo de pedido */}
            <div className="sm:col-span-2">
              <label className="label">Tipo de pedido *</label>
              <div className="grid grid-cols-2 gap-3">
                {(['PICKUP', 'DELIVERY'] as OrderType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, orderType: type }))}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all',
                      form.orderType === type
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-stone-200 dark:border-stone-700 hover:border-stone-300',
                    )}
                  >
                    {type === 'PICKUP'
                      ? <Store className="w-5 h-5 text-stone-500 flex-shrink-0" />
                      : <Truck className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    }
                    <div>
                      <p className={cn('text-sm font-medium', form.orderType === type ? 'text-primary-700 dark:text-primary-300' : 'text-stone-700 dark:text-stone-300')}>
                        {ORDER_TYPE_LABELS[type]}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Campos condicionales para DELIVERY */}
            {form.orderType === 'DELIVERY' && (
              <>
                <div className="sm:col-span-2">
                  <label className="label">Dirección de entrega *</label>
                  <input
                    className="input"
                    placeholder="Calle, número, barrio, ciudad..."
                    value={form.deliveryAddress}
                    onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Modo de pago *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['PRE_PAYMENT', 'ON_DELIVERY'] as PaymentMode[]).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, paymentMode: mode }))}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all',
                          form.paymentMode === mode
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-stone-200 dark:border-stone-700 hover:border-stone-300',
                        )}
                      >
                        <CreditCard className={cn('w-5 h-5 flex-shrink-0', form.paymentMode === mode ? 'text-emerald-500' : 'text-stone-400')} />
                        <div>
                          <p className={cn('text-sm font-medium', form.paymentMode === mode ? 'text-emerald-700 dark:text-emerald-300' : 'text-stone-700 dark:text-stone-300')}>
                            {PAYMENT_MODE_LABELS[mode]}
                          </p>
                          <p className="text-xs text-stone-400 mt-0.5">
                            {mode === 'PRE_PAYMENT' ? 'El cliente paga antes del envío' : 'El repartidor cobra al entregar'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
              <input
                type="checkbox"
                id="isCustom"
                checked={form.isCustom}
                onChange={e => setForm(f => ({ ...f, isCustom: e.target.checked }))}
                className="w-4 h-4 accent-primary-600 flex-shrink-0"
              />
              <div>
                <label htmlFor="isCustom" className="text-sm font-medium text-stone-700 dark:text-stone-300 cursor-pointer">
                  Pedido personalizado (torta / diseño especial)
                </label>
                <p className="text-xs text-stone-400 mt-0.5">
                  Activa esta opción para pedidos con diseño específico. Podrás subir una imagen de referencia.
                </p>
              </div>
            </div>
            <div className={cn('sm:col-span-2', form.isCustom && 'ring-2 ring-primary-200 dark:ring-primary-800 rounded-xl p-3')}>
              <label className="label">
                {form.isCustom ? 'Imagen de referencia del diseño *' : 'Imagen de referencia (opcional)'}
              </label>
              {form.isCustom && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                  Para pedidos personalizados se recomienda subir una imagen de referencia del diseño solicitado.
                </p>
              )}
              <ImageUpload
                value={form.imageUrl}
                onChange={(url) => setForm(f => ({ ...f, imageUrl: url }))}
                aspectRatio="wide"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Instrucciones especiales..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="label">Productos del pedido *</p>
              <button type="button" className="btn-secondary text-xs py-1.5" onClick={addDetail}>
                <Plus className="w-3 h-3" /> Agregar producto
              </button>
            </div>
            {form.details.length === 0 && (
              <p className="text-sm text-stone-400 text-center py-4 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-lg">
                Sin productos — haz clic en "Agregar producto"
              </p>
            )}
            <div className="space-y-2">
              {form.details.map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 bg-stone-50 dark:bg-stone-800 rounded-lg">
                  <div className="col-span-5">
                    <select
                      className="input text-sm"
                      value={d.productId}
                      onChange={e => updateDetail(i, 'productId', e.target.value)}
                    >
                      <option value="">Producto...</option>
                      {products.filter(p => p.isActive).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      className="input text-sm"
                      placeholder="Cant."
                      min={1}
                      value={d.quantity}
                      onChange={e => updateDetail(i, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      className="input text-sm"
                      placeholder="Precio"
                      min={0}
                      step={0.01}
                      value={d.unitPrice}
                      onChange={e => updateDetail(i, 'unitPrice', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center pt-2">
                    <span className="text-xs text-stone-500 font-medium">
                      {formatCurrency(d.quantity * d.unitPrice)}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-center pt-2">
                    <button type="button" onClick={() => removeDetail(i)} className="text-rose-400 hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="col-span-11">
                    <input
                      className="input text-xs"
                      placeholder="Notas del producto (opcional)"
                      value={d.notes}
                      onChange={e => updateDetail(i, 'notes', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            {form.details.length > 0 && (
              <div className="flex justify-end mt-2 pr-1">
                <p className="text-sm font-semibold">
                  Total: <span className="text-primary-600 text-base">{formatCurrency(total)}</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-stone-200 dark:border-stone-700">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setModalOpen(false); setForm(emptyForm()); }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Crear pedido'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
