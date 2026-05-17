import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Truck, MapPin, CheckCircle, AlertTriangle, CreditCard, Clock, Store } from 'lucide-react';
import { deliveryService, usersService } from '@/services/index';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import {
  formatDate, formatCurrency, DELIVERY_STATUS_LABELS, PAYMENT_MODE_LABELS, PAYMENT_METHOD_LABELS, getApiError,
} from '@/lib/utils';
import type { Delivery, DeliveryStatus, PaymentMethod } from '@/types';
import toast from '@/lib/toast';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'QR', 'CARD', 'TRANSFER'];

const emptyPaymentForm = () => ({
  paymentMethod: 'CASH' as PaymentMethod,
  amount: '',
  notes: '',
});

export default function DeliveryPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [assignModal, setAssignModal] = useState<Delivery | null>(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [deliveryCostInput, setDeliveryCostInput] = useState('');
  const [paymentModal, setPaymentModal] = useState<Delivery | null>(null);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm());

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', page, limit, statusFilter],
    queryFn: () => deliveryService.getAll({ page, limit, status: statusFilter as DeliveryStatus || undefined }),
  });

  const { data: drivers, isLoading: driversLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => usersService.getAll({ limit: 100, role: 'DELIVERY' }),
    staleTime: 5 * 60 * 1000,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, driverId, deliveryCost }: { id: string; driverId: string; deliveryCost?: number }) =>
      deliveryService.assignDriver(id, driverId, deliveryCost),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      toast.success('Repartidor asignado');
      setAssignModal(null);
      setSelectedDriver('');
      setDeliveryCostInput('');
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      deliveryService.updateStatus(id, { status }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      if (vars.status === 'DELIVERED') {
        qc.invalidateQueries({ queryKey: ['orders'] });
        toast.success('Entrega completada — pedido marcado como Entregado');
      } else {
        toast.success('Estado actualizado');
      }
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      deliveryService.registerPayment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pago registrado correctamente');
      setPaymentModal(null);
      setPaymentForm(emptyPaymentForm());
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) return toast.error('Ingresa un monto válido');
    paymentMutation.mutate({
      id: paymentModal.id,
      data: { paymentMethod: paymentForm.paymentMethod, amount, notes: paymentForm.notes || undefined },
    });
  };

  const STATUSES: DeliveryStatus[] = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'];

  const columns = [
    {
      key: 'order',
      header: 'Pedido',
      render: (d: Delivery) => (
        <div>
          <span className="font-mono text-sm font-semibold text-primary-600">{d.order?.orderNumber}</span>
          {d.order?.paymentMode && (
            <div className="flex items-center gap-1 mt-0.5">
              <CreditCard className="w-3 h-3 text-stone-400" />
              <span className="text-xs text-stone-500">{PAYMENT_MODE_LABELS[d.order.paymentMode]}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente / Dirección',
      render: (d: Delivery) => (
        <div>
          <p className="font-medium">{d.order?.customer?.firstName} {d.order?.customer?.lastName}</p>
          <p className="text-xs text-stone-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />{d.address}
          </p>
        </div>
      ),
    },
    {
      key: 'driver',
      header: 'Repartidor',
      render: (d: Delivery) => d.driver ? (
        <div>
          <p>{d.driver.firstName} {d.driver.lastName}</p>
          {Number(d.deliveryCost) > 0 && (
            <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
              <Truck className="w-3 h-3" />{formatCurrency(d.deliveryCost)}
            </p>
          )}
        </div>
      ) : <span className="text-amber-600 flex items-center gap-1 text-xs"><AlertTriangle className="w-3 h-3" />Sin asignar</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (d: Delivery) => (
        <div className="space-y-1">
          <span className={cn('badge', STATUS_COLORS[d.status])}>{DELIVERY_STATUS_LABELS[d.status]}</span>
          {/* PRE_PAYMENT waiting for payment indicator */}
          {d.order?.paymentMode === 'PRE_PAYMENT' && d.order?.status !== 'PAID' && d.status !== 'DELIVERED' && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600 font-medium">Esperando pago</span>
            </div>
          )}
          {/* ON_DELIVERY with payment done indicator */}
          {d.order?.paymentMode === 'ON_DELIVERY' && d.order?.status === 'PAID' && d.status === 'IN_TRANSIT' && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">Pago recibido</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (d: Delivery) => formatDate(d.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (d: Delivery) => {
        const isPrePaymentBlocked =
          d.order?.paymentMode === 'PRE_PAYMENT' && d.order?.status !== 'PAID';
        const isOnDeliveryNeedsPayment =
          d.status === 'IN_TRANSIT' &&
          d.order?.paymentMode === 'ON_DELIVERY' &&
          d.order?.status !== 'PAID';
        const canMarkDelivered =
          d.status === 'IN_TRANSIT' && !isOnDeliveryNeedsPayment;

        return (
          <div className="flex items-center gap-2 justify-end flex-wrap">
            {/* Assign driver button */}
            {d.status === 'PENDING' && (
              isPrePaymentBlocked ? (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
                  <Store className="w-3 h-3" /> Pagar primero
                </span>
              ) : (
                <button
                  onClick={() => { setAssignModal(d); setSelectedDriver(''); }}
                  className="btn-secondary text-xs py-1 px-2"
                >
                  <Truck className="w-3 h-3" /> Asignar
                </button>
              )
            )}

            {/* In transit button */}
            {d.status === 'ASSIGNED' && (
              <button
                onClick={() => statusMutation.mutate({ id: d.id, status: 'IN_TRANSIT' })}
                disabled={statusMutation.isPending}
                className="btn-secondary text-xs py-1 px-2 text-purple-600"
              >
                En tránsito
              </button>
            )}

            {/* Register payment (ON_DELIVERY) */}
            {isOnDeliveryNeedsPayment && (
              <button
                onClick={() => {
                  setPaymentModal(d);
                  const totalToPay = (Number(d.order?.totalAmount ?? 0) + Number(d.deliveryCost ?? 0)).toFixed(2);
                  setPaymentForm({ ...emptyPaymentForm(), amount: totalToPay });
                }}
                className="btn-secondary text-xs py-1 px-2 text-emerald-600"
              >
                <CreditCard className="w-3 h-3" /> Registrar pago
              </button>
            )}

            {/* Delivered button */}
            {canMarkDelivered && (
              <button
                onClick={() => statusMutation.mutate({ id: d.id, status: 'DELIVERED' })}
                disabled={statusMutation.isPending}
                className="btn-secondary text-xs py-1 px-2 text-emerald-600"
              >
                <CheckCircle className="w-3 h-3" /> Entregado
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery" subtitle={`${data?.meta?.total ?? 0} entregas`} />

      <div className="card p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input max-w-xs"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{DELIVERY_STATUS_LABELS[s]}</option>
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
        emptyMessage="No hay entregas registradas"
      />

      {/* Assign driver modal */}
      {assignModal && (
        <Modal isOpen={!!assignModal} onClose={() => { setAssignModal(null); setDeliveryCostInput(''); }} title="Asignar repartidor">
          <div className="space-y-4">
            <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-lg text-sm space-y-1">
              <p className="font-medium">{assignModal.order?.orderNumber}</p>
              <p className="text-stone-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />{assignModal.address}
              </p>
              <p className="text-stone-600 font-medium">
                Total pedido: {formatCurrency(assignModal.order?.totalAmount ?? 0)}
              </p>
            </div>
            <div>
              <label className="label">Repartidor</label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="input"
                disabled={driversLoading}
              >
                <option value="">
                  {driversLoading ? 'Cargando repartidores...' : 'Seleccionar repartidor'}
                </option>
                {drivers?.data?.filter((u: any) => u.isActive).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
              {!driversLoading && drivers?.data?.filter((u: any) => u.isActive).length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No hay repartidores activos registrados</p>
              )}
            </div>
            <div>
              <label className="label">Costo de delivery <span className="text-stone-400 font-normal">(opcional)</span></label>
              <input
                type="number"
                min="0"
                step="0.50"
                className="input"
                placeholder="0.00"
                value={deliveryCostInput}
                onChange={(e) => setDeliveryCostInput(e.target.value)}
              />
              {deliveryCostInput && Number(deliveryCostInput) > 0 && (
                <p className="text-xs text-stone-500 mt-1">
                  Total a cobrar: {formatCurrency(Number(assignModal.order?.totalAmount ?? 0) + Number(deliveryCostInput))}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => { setAssignModal(null); setDeliveryCostInput(''); }}>Cancelar</button>
              <button
                className="btn-primary"
                disabled={!selectedDriver || assignMutation.isPending}
                onClick={() => assignMutation.mutate({
                  id: assignModal.id,
                  driverId: selectedDriver,
                  deliveryCost: deliveryCostInput ? Number(deliveryCostInput) : 0,
                })}
              >
                {assignMutation.isPending ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Register payment modal (ON_DELIVERY) */}
      {paymentModal && (() => {
        const orderTotal = Number(paymentModal.order?.totalAmount ?? 0);
        const deliveryCost = Number(paymentModal.deliveryCost ?? 0);
        const totalToPay = orderTotal + deliveryCost;
        const amountReceived = parseFloat(paymentForm.amount) || 0;
        const change = amountReceived - totalToPay;
        return (
          <Modal isOpen={!!paymentModal} onClose={() => setPaymentModal(null)} title="Registrar pago contra entrega">
            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-lg text-sm space-y-1">
                <p className="font-semibold">{paymentModal.order?.orderNumber}</p>
                <p className="text-stone-500">{paymentModal.order?.customer?.firstName} {paymentModal.order?.customer?.lastName}</p>
                <p className="text-stone-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{paymentModal.address}
                </p>
              </div>

              {/* Desglose de cobro */}
              <div className="rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden text-sm">
                <div className="flex justify-between px-3 py-2 bg-stone-50 dark:bg-stone-800">
                  <span className="text-stone-600">Subtotal pedido</span>
                  <span className="font-medium">{formatCurrency(orderTotal)}</span>
                </div>
                {deliveryCost > 0 && (
                  <div className="flex justify-between px-3 py-2 border-t border-stone-200 dark:border-stone-700">
                    <span className="text-stone-600 flex items-center gap-1"><Truck className="w-3 h-3" />Costo de delivery</span>
                    <span className="font-medium">{formatCurrency(deliveryCost)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2 bg-primary-50 dark:bg-primary-900/20 border-t border-primary-200 dark:border-primary-800">
                  <span className="font-semibold text-primary-700 dark:text-primary-400">Total a cobrar</span>
                  <span className="font-bold text-primary-700 dark:text-primary-400 text-base">{formatCurrency(totalToPay)}</span>
                </div>
              </div>

              <div>
                <label className="label">Método de pago</label>
                <select
                  className="input"
                  value={paymentForm.paymentMethod}
                  onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Monto recibido *</label>
                <input
                  type="number"
                  step="0.01"
                  min={totalToPay}
                  className="input"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                />
                {amountReceived > 0 && change >= 0 && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    Vuelto: {formatCurrency(change)}
                  </p>
                )}
                {amountReceived > 0 && change < 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Monto insuficiente — faltan {formatCurrency(Math.abs(change))}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Notas (opcional)</label>
                <input
                  className="input"
                  placeholder="Ej: pagó con billete de 100..."
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setPaymentModal(null)}>Cancelar</button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={paymentMutation.isPending || amountReceived < totalToPay}
                >
                  {paymentMutation.isPending ? 'Registrando...' : 'Confirmar pago'}
                </button>
              </div>
            </form>
          </Modal>
        );
      })()}
    </div>
  );
}
