import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Banknote, QrCode, ArrowLeftRight, Eye,
  CheckCircle, Search, Package, UserCircle, X,
} from 'lucide-react';
import { salesService, customersService, ordersService } from '@/services/index';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import {
  formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, getApiError,
} from '@/lib/utils';
import type { Sale, Customer, Order, OrderDetail } from '@/types';
import toast from '@/lib/toast';
import { cn } from '@/lib/utils';

const PAYMENT_ICONS: Record<string, any> = {
  CASH: Banknote, QR: QrCode, CARD: CreditCard, TRANSFER: ArrowLeftRight,
};

// ─── Charge Order Modal ───────────────────────────────────────────────────────
function ChargeOrderModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'QR' | 'TRANSFER'>('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  const { data: readyOrdersData } = useQuery({
    queryKey: ['orders-ready-for-payment'],
    queryFn: () => ordersService.getAll({ limit: 100, status: 'READY' }),
    enabled: isOpen,
  });
  const readyOrders: Order[] = (readyOrdersData as any)?.data ?? [];

  const { data: customersFound } = useQuery({
    queryKey: ['customers-search-payments', customerSearch],
    queryFn: () => customersService.getAll({ search: customerSearch, limit: 8 }),
    enabled: isOpen && !order && customerSearch.trim().length >= 1,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setOrder(null);
    setSelectedCustomer(null);
    if (!orderId) return;
    setLoadingOrder(true);
    try {
      const loaded: Order = await ordersService.getOne(orderId);
      setOrder(loaded);
      if (loaded.customer) setSelectedCustomer(loaded.customer as Customer);
    } catch {
      toast.error('No se pudo cargar el pedido');
      setSelectedOrderId('');
    } finally {
      setLoadingOrder(false);
    }
  };

  const total = order ? Number(order.totalAmount) : 0;
  const paid = parseFloat(amountPaid) || 0;
  const change = paymentMethod === 'CASH' ? Math.max(0, paid - total) : 0;
  const canProcess = !!order && (paymentMethod !== 'CASH' || paid >= total);

  const chargeMutation = useMutation({
    mutationFn: () => {
      if (!order) throw new Error('No order selected');
      const paymentAmount = paymentMethod === 'CASH' ? Math.max(paid, total) : total;
      const details: any[] = (order.orderDetails ?? []).map((d: OrderDetail) => ({
        productId: d.productId,
        quantity: d.quantity,
        unitPrice: Number(d.unitPrice),
      }));
      return salesService.create({
        customerId: selectedCustomer?.id ?? order.customerId,
        orderId: order.id,
        notes: notes.trim() || undefined,
        details,
        payments: [{ method: paymentMethod, amount: paymentAmount, reference: paymentReference.trim() || undefined }],
      });
    },
    onSuccess: () => {
      toast.success(`Pedido ${order?.orderNumber} cobrado — estado actualizado a Pagado`);
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['orders-ready-for-payment'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['payments-summary'] });
      if (order?.id) qc.invalidateQueries({ queryKey: ['order', order.id] });
      handleClose();
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const handleClose = () => {
    setSelectedOrderId('');
    setOrder(null);
    setPaymentMethod('CASH');
    setAmountPaid('');
    setPaymentReference('');
    setNotes('');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cobrar pedido" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Pedido en estado Listo *</label>
          <select
            className="input"
            value={selectedOrderId}
            onChange={(e) => handleSelectOrder(e.target.value)}
            disabled={loadingOrder}
          >
            <option value="">Seleccionar pedido...</option>
            {readyOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber} — {o.customer?.firstName} {o.customer?.lastName}
              </option>
            ))}
          </select>
          {readyOrders.length === 0 && (
            <p className="text-xs text-stone-400 mt-1">No hay pedidos en estado Listo disponibles para cobrar.</p>
          )}
          {loadingOrder && <p className="text-xs text-primary-500 mt-1 animate-pulse">Cargando pedido...</p>}
        </div>

        {order && (
          <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Detalle del pedido</span>
              <span className={cn('badge text-xs', ORDER_STATUS_COLORS[order.status])}>{ORDER_STATUS_LABELS[order.status]}</span>
            </div>
            <div className="space-y-1">
              {(order.orderDetails ?? []).map((d: OrderDetail) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className="text-stone-600 dark:text-stone-400">{d.product?.name ?? '—'} × {d.quantity}</span>
                  <span className="font-medium">{formatCurrency(d.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-stone-200 dark:border-stone-700 pt-2">
              <span>Total a cobrar</span>
              <span className="text-emerald-600 text-lg">{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        {order && (
          <div ref={customerRef} className="relative">
            <label className="label flex items-center gap-1.5 mb-1"><UserCircle className="w-3.5 h-3.5" /> Cliente</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary-300 bg-primary-50 dark:bg-primary-900/20">
                <div>
                  <p className="text-sm font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                  {selectedCustomer.phone && <p className="text-xs text-stone-500">{selectedCustomer.phone}</p>}
                </div>
                {!order.customerId && (
                  <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="btn-ghost p-1 text-stone-400 hover:text-rose-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="input pl-8 text-sm"
                  placeholder="Buscar cliente (opcional)..."
                />
                {showCustomerDropdown && customerSearch.trim().length >= 1 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 card shadow-lg max-h-48 overflow-y-auto scrollbar-thin">
                    {(customersFound?.data ?? []).length === 0 ? (
                      <p className="p-3 text-sm text-stone-400 text-center">Sin resultados</p>
                    ) : (
                      (customersFound?.data ?? []).map((c: Customer) => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDropdown(false); }} className="w-full text-left px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                          <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                          <p className="text-xs text-stone-500">{c.phone}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {order && (
          <div>
            <label className="label mb-1">Método de pago *</label>
            <div className="grid grid-cols-4 gap-1">
              {(['CASH', 'CARD', 'QR', 'TRANSFER'] as const).map((m) => {
                const Icon = PAYMENT_ICONS[m];
                return (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all ${paymentMethod === m ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-primary-300'}`}>
                    <Icon className="w-4 h-4" />
                    {PAYMENT_METHOD_LABELS[m]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {order && paymentMethod === 'CASH' && (
          <div>
            <label className="label">Monto recibido</label>
            <input type="number" min="0" placeholder={total.toFixed(2)} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="input" />
            {paid > 0 && paid >= total && (
              <p className="text-sm text-emerald-600 font-semibold mt-1">Cambio: {formatCurrency(change)}</p>
            )}
            {paid > 0 && paid < total && (
              <p className="text-sm text-rose-500 mt-1">Faltan {formatCurrency(total - paid)}</p>
            )}
          </div>
        )}
        {order && paymentMethod !== 'CASH' && (
          <div>
            <label className="label">Referencia / N° operación</label>
            <input placeholder="Opcional" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="input" />
          </div>
        )}

        {order && (
          <div>
            <label className="label">Notas</label>
            <input placeholder="Observaciones (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="input text-sm" />
          </div>
        )}

        {order && (
          <div className="flex items-start gap-1.5 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Al registrar el cobro, el pedido pasará automáticamente a estado <strong>Pagado</strong>. Se generará una factura.</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-stone-200 dark:border-stone-700">
          <button type="button" className="btn-secondary" onClick={handleClose}>Cancelar</button>
          <button
            className="btn-primary"
            disabled={!canProcess || chargeMutation.isPending}
            onClick={() => chargeMutation.mutate()}
          >
            {chargeMutation.isPending ? 'Procesando...' : 'Registrar cobro'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [chargeOpen, setChargeOpen] = useState(false);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, limit, search],
    queryFn: () => salesService.getAll({ page, limit, search }),
  });

  const { data: summary } = useQuery({
    queryKey: ['payments-summary'],
    queryFn: () => salesService.getDailySummary(),
    refetchInterval: 60000,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['orders-ready-count'],
    queryFn: () => ordersService.getAll({ limit: 1, status: 'READY' }),
    refetchInterval: 30000,
  });
  const pendingCount = (pendingData as any)?.meta?.total ?? 0;

  const sales: Sale[] = (data as any)?.data ?? [];

  const columns = [
    {
      key: 'saleNumber', header: 'N° Cobro',
      render: (s: Sale) => <span className="font-mono text-sm font-semibold text-primary-600">{s.saleNumber}</span>,
    },
    {
      key: 'type', header: 'Tipo',
      render: (s: Sale) => s.orderId
        ? <span className="badge bg-blue-100 text-blue-700 flex items-center gap-1 text-xs"><Package className="w-3 h-3" />Pedido</span>
        : <span className="badge bg-stone-100 text-stone-600 text-xs">Directa</span>,
    },
    {
      key: 'customer', header: 'Cliente',
      render: (s: Sale) => s.customer
        ? `${s.customer.firstName} ${s.customer.lastName}`
        : <span className="text-stone-400 italic text-sm">Sin cliente</span>,
    },
    {
      key: 'payments', header: 'Método',
      render: (s: Sale) => (
        <div className="flex gap-1 flex-wrap">
          {s.payments?.map((p, i) => {
            const Icon = PAYMENT_ICONS[p.method];
            return (
              <span key={i} className="badge bg-stone-100 dark:bg-stone-800 flex items-center gap-1 text-xs">
                <Icon className="w-3 h-3" />{PAYMENT_METHOD_LABELS[p.method]}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      key: 'total', header: 'Total',
      render: (s: Sale) => <span className="font-bold text-emerald-600">{formatCurrency(s.total)}</span>,
    },
    {
      key: 'createdAt', header: 'Fecha',
      render: (s: Sale) => formatDateTime(s.createdAt),
    },
    {
      key: 'actions', header: '',
      render: (s: Sale) => (
        <button onClick={() => setViewSale(s)} className="btn-ghost p-1.5 text-stone-500 hover:text-primary-600">
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cobros"
        subtitle="Registro de cobros de pedidos y ventas"
        actions={
          <button className="btn-primary" onClick={() => setChargeOpen(true)}>
            <CreditCard className="w-4 h-4" /> Cobrar pedido
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-stone-500 mb-1">Cobros hoy</p>
          <p className="text-3xl font-bold text-stone-900 dark:text-white">{summary?.totalSales ?? 0}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-stone-500 mb-1">Recaudado hoy</p>
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(summary?.totalRevenue ?? 0)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-stone-500 mb-1">Pedidos pendientes de cobro</p>
          <p className={`text-3xl font-bold ${pendingCount > 0 ? 'text-amber-500' : 'text-stone-400'}`}>{pendingCount}</p>
          {pendingCount > 0 && <p className="text-xs text-amber-500 mt-1">Listos para cobrar</p>}
        </div>
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9"
            placeholder="Buscar cobros..."
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={sales}
        loading={isLoading}
        meta={(data as any)?.meta}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        emptyMessage="No hay cobros registrados"
      />

      {viewSale && (
        <Modal isOpen={!!viewSale} onClose={() => setViewSale(null)} title={`Cobro ${viewSale.saleNumber}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="label">Tipo</p>
                <p>{viewSale.orderId ? 'Cobro de pedido' : 'Venta directa'}</p>
              </div>
              <div>
                <p className="label">Cliente</p>
                <p>{viewSale.customer ? `${viewSale.customer.firstName} ${viewSale.customer.lastName}` : 'Sin cliente'}</p>
              </div>
              <div><p className="label">Subtotal</p><p>{formatCurrency(viewSale.subtotal)}</p></div>
              <div><p className="label">Descuento</p><p>{formatCurrency(viewSale.discount)}</p></div>
              <div><p className="label">Total</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(viewSale.total)}</p></div>
            </div>
            <div>
              <p className="label mb-2">Productos</p>
              {viewSale.saleDetails?.map((d) => (
                <div key={d.id} className="flex justify-between text-sm p-2 bg-stone-50 dark:bg-stone-800 rounded mb-1">
                  <span>{d.product?.name} × {d.quantity}</span>
                  <span className="font-semibold">{formatCurrency(d.subtotal)}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="label mb-2">Pagos</p>
              {viewSale.payments?.map((p, i) => (
                <div key={i} className="flex justify-between text-sm p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded mb-1">
                  <span className="flex items-center gap-1">{PAYMENT_METHOD_LABELS[p.method]} {p.reference && `(${p.reference})`}</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      <ChargeOrderModal isOpen={chargeOpen} onClose={() => setChargeOpen(false)} />
    </div>
  );
}
