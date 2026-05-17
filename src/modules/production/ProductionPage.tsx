import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Clock, CheckCircle, Paintbrush, Package,
  Eye, ChevronRight, User, Calendar, ClipboardList,
  AlertCircle, Link as LinkIcon, Search,
} from 'lucide-react';
import { productionService, usersService, ordersService } from '@/services/index';
import { recipesService } from '@/services/index';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import {
  formatDate, formatDateTime,
  PRODUCTION_STATUS_LABELS, PRODUCTION_STATUS_COLORS,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  getApiError,
} from '@/lib/utils';
import type { ProductionStatus } from '@/types';
import toast from '@/lib/toast';
import { cn } from '@/lib/utils';

// ─── Status flow ─────────────────────────────────────────────────────────────
const FLOW: ProductionStatus[] = ['PENDING', 'PREPARING', 'DECORATING', 'FINISHED'];
const STEP_ICONS = [Clock, Package, Paintbrush, CheckCircle];

const NEXT_LABELS: Partial<Record<ProductionStatus, string>> = {
  PENDING: 'Iniciar preparación',
  PREPARING: 'Pasar a decoración',
  DECORATING: 'Finalizar producción',
};

function getNext(s: ProductionStatus): ProductionStatus | null {
  const i = FLOW.indexOf(s);
  if (i === -1 || i === FLOW.length - 1) return null;
  return FLOW[i + 1];
}

// ─── Status Stepper ───────────────────────────────────────────────────────────
function ProductionStepper({ status }: { status: ProductionStatus }) {
  const currentIdx = FLOW.indexOf(status);
  return (
    <div className="flex items-start w-full">
      {FLOW.map((s, i) => {
        const Icon = STEP_ICONS[i];
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={s} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                isDone && 'bg-green-500 text-white',
                isCurrent && 'bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900',
                !isDone && !isCurrent && 'bg-stone-200 dark:bg-stone-700 text-stone-400',
              )}>
                {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={cn(
                'text-xs mt-1.5 font-medium text-center leading-tight px-0.5',
                isDone && 'text-green-600 dark:text-green-400',
                isCurrent && 'text-primary-600',
                !isDone && !isCurrent && 'text-stone-400',
              )}>
                {PRODUCTION_STATUS_LABELS[s]}
              </span>
            </div>
            {i < FLOW.length - 1 && (
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

// ─── Production Detail ────────────────────────────────────────────────────────
function ProductionDetailView({
  orderId, onClose,
}: { orderId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [selectedBaker, setSelectedBaker] = useState('');
  const [showAssign, setShowAssign] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['production-order', orderId],
    queryFn: () => productionService.getOne(orderId),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-bakers'],
    queryFn: () => usersService.getAll({ limit: 100 }),
  });

  const bakers = ((usersData as any)?.data ?? []).filter(
    (u: any) => u.role === 'BAKER' && u.isActive,
  );

  const statusMutation = useMutation({
    mutationFn: (vars: { status: string; notes?: string }) =>
      productionService.updateStatus(orderId, vars),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['production'] });
      qc.invalidateQueries({ queryKey: ['production-order', orderId] });
      qc.invalidateQueries({ queryKey: ['production-count'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (vars.status === 'FINISHED' && order?.orderId) {
        qc.invalidateQueries({ queryKey: ['order', order.orderId] });
      }
      toast.success(vars.status === 'FINISHED' ? 'Producción finalizada — pedido actualizado a Listo' : 'Estado actualizado');
      setAdvanceNotes('');
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const assignMutation = useMutation({
    mutationFn: (bakerId: string) => productionService.assignBaker(orderId, bakerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production'] });
      qc.invalidateQueries({ queryKey: ['production-order', orderId] });
      toast.success('Pastelero asignado');
      setShowAssign(false);
      setSelectedBaker('');
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

  const next = getNext(order.status as ProductionStatus);
  const nextLabel = NEXT_LABELS[order.status as ProductionStatus];
  const isFinished = order.status === 'FINISHED';

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-4">
          Progreso de producción
        </p>
        <ProductionStepper status={order.status as ProductionStatus} />
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          <p className="text-xs text-stone-500 mb-0.5">Producto</p>
          <p className="font-semibold">{order.recipe?.product?.name ?? '—'}</p>
          {order.recipe?.product?.category && (
            <p className="text-xs text-stone-400">{order.recipe.product.category.name}</p>
          )}
        </div>
        <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          <p className="text-xs text-stone-500 mb-0.5">Cantidad a producir</p>
          <p className="font-bold text-2xl text-primary-600">{order.quantity}
            <span className="text-sm font-normal text-stone-400 ml-1">unidades</span>
          </p>
        </div>
        <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          <p className="text-xs text-stone-500 mb-0.5">Inicio</p>
          {order.startDate
            ? <p className="font-medium">{formatDateTime(order.startDate)}</p>
            : <p className="text-stone-400 italic text-xs">No iniciado</p>
          }
        </div>
        <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          <p className="text-xs text-stone-500 mb-0.5">Finalización</p>
          {order.endDate
            ? <p className="font-medium text-green-600">{formatDateTime(order.endDate)}</p>
            : <p className="text-stone-400 italic text-xs">En proceso</p>
          }
        </div>
      </div>

      {/* Linked order */}
      {order.order && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
            <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Pedido vinculado</p>
              <p className="font-semibold text-blue-800 dark:text-blue-300 truncate">
                {order.order.orderNumber}
              </p>
            </div>
            <span className={cn('badge text-xs', ORDER_STATUS_COLORS[order.order.status])}>
              {ORDER_STATUS_LABELS[order.order.status]}
            </span>
          </div>
          <p className="text-xs text-stone-400 px-1">
            El estado del pedido se sincroniza automáticamente: al finalizar toda la producción el pedido pasará a <strong>Listo</strong>.
          </p>
        </div>
      )}

      {/* Recipe instructions */}
      {order.recipe?.instructions && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Instrucciones de receta
          </p>
          <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed whitespace-pre-line">
            {order.recipe.instructions}
          </p>
        </div>
      )}

      {/* Ingredients */}
      {order.recipe?.recipeDetails?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Ingredientes necesarios
          </p>
          <div className="space-y-1">
            {order.recipe.recipeDetails.map((d: any) => {
              const needed = d.quantity * order.quantity;
              const hasStock = d.ingredient?.stock >= needed;
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-stone-800 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2">
                    {!hasStock && (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                    )}
                    <span className={cn('font-medium', !hasStock && 'text-rose-600')}>
                      {d.ingredient?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-stone-500 text-xs">
                      Necesario: <strong>{needed} {d.unit}</strong>
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      hasStock
                        ? 'bg-green-100 text-green-700'
                        : 'bg-rose-100 text-rose-700',
                    )}>
                      Stock: {d.ingredient?.stock ?? '?'} {d.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assignee */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Pastelero asignado
          </p>
          {!isFinished && (
            <button
              onClick={() => setShowAssign(!showAssign)}
              className="text-xs text-primary-600 hover:underline"
            >
              {showAssign ? 'Cancelar' : order.assignee ? 'Cambiar' : 'Asignar'}
            </button>
          )}
        </div>
        {order.assignee ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 dark:bg-stone-800 rounded-lg text-sm">
            <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium">{order.assignee.firstName} {order.assignee.lastName}</p>
              {order.assignee.email && (
                <p className="text-xs text-stone-400">{order.assignee.email}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-400 italic px-3">Sin pastelero asignado</p>
        )}
        {showAssign && (
          <div className="flex gap-2 mt-2">
            <select
              value={selectedBaker}
              onChange={e => setSelectedBaker(e.target.value)}
              className="input flex-1 text-sm"
            >
              <option value="">Seleccionar pastelero...</option>
              {bakers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedBaker && assignMutation.mutate(selectedBaker)}
              disabled={!selectedBaker || assignMutation.isPending}
              className="btn-primary text-sm"
            >
              {assignMutation.isPending ? '...' : 'Asignar'}
            </button>
          </div>
        )}
      </div>

      {/* Notes field for advance */}
      {next && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-2">
            Notas al avanzar (opcional)
          </label>
          <textarea
            className="input resize-none text-sm"
            rows={2}
            placeholder={`Observaciones al ${NEXT_LABELS[order.status as ProductionStatus]?.toLowerCase()}...`}
            value={advanceNotes}
            onChange={e => setAdvanceNotes(e.target.value)}
          />
        </div>
      )}

      {/* Order notes */}
      {order.notes && (
        <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg text-sm">
          <p className="text-xs text-stone-500 mb-1">Notas registradas</p>
          <p className="text-stone-700 dark:text-stone-300">{order.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-stone-200 dark:border-stone-700">
        <div className="flex-1" />
        <button onClick={onClose} className="btn-secondary text-sm">Cerrar</button>
        {next && (
          <button
            onClick={() => statusMutation.mutate({ status: next, notes: advanceNotes || undefined })}
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
                {nextLabel}
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Create Form ──────────────────────────────────────────────────────────────
const emptyCreateForm = () => ({
  recipeId: '',
  quantity: 1,
  assignedTo: '',
  orderId: '',
  notes: '',
});

function CreateProductionModal({
  isOpen, onClose,
}: { isOpen: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyCreateForm());

  const { data: recipesData } = useQuery({
    queryKey: ['recipes-list'],
    queryFn: () => recipesService.getAll({ limit: 100 }),
    enabled: isOpen,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-bakers'],
    queryFn: () => usersService.getAll({ limit: 100 }),
    enabled: isOpen,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders-for-production'],
    queryFn: () => ordersService.getAll({ limit: 200 }),
    enabled: isOpen,
  });

  const recipes = (recipesData as any)?.data ?? [];
  const bakers = ((usersData as any)?.data ?? []).filter(
    (u: any) => u.role === 'BAKER' && u.isActive,
  );
  const linkableOrders = ((ordersData as any)?.data ?? []).filter(
    (o: any) => o.status === 'CONFIRMED',
  );

  const createMutation = useMutation({
    mutationFn: (data: any) => productionService.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['production'] });
      qc.invalidateQueries({ queryKey: ['production-count'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders-for-production'] });
      if (vars.orderId) {
        qc.invalidateQueries({ queryKey: ['order', vars.orderId] });
        toast.success('Orden creada — el pedido vinculado fue actualizado a En producción');
      } else {
        toast.success('Orden de producción creada');
      }
      setForm(emptyCreateForm());
      onClose();
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipeId) return toast.error('Selecciona una receta');
    if (form.quantity < 1) return toast.error('La cantidad debe ser al menos 1');
    createMutation.mutate({
      recipeId: form.recipeId,
      quantity: Number(form.quantity),
      assignedTo: form.assignedTo || undefined,
      orderId: form.orderId || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva orden de producción" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Receta / Producto *</label>
          <select
            className="input"
            value={form.recipeId}
            onChange={e => setForm(f => ({ ...f, recipeId: e.target.value }))}
          >
            <option value="">Seleccionar receta...</option>
            {recipes.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.product?.name ?? 'Receta sin producto'} — rinde {r.yield} unid.
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Cantidad a producir *</label>
          <input
            type="number"
            className="input"
            min={1}
            value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
          />
        </div>

        <div>
          <label className="label">Asignar pastelero</label>
          <select
            className="input"
            value={form.assignedTo}
            onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
          >
            <option value="">Sin asignar (asignar luego)</option>
            {bakers.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Vincular a pedido de cliente</label>
          <select
            className="input"
            value={form.orderId}
            onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
          >
            <option value="">Sin vincular (producción para stock)</option>
            {linkableOrders.map((o: any) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber} — {o.customer?.firstName} {o.customer?.lastName} [{ORDER_STATUS_LABELS[o.status as any] ?? o.status}]
              </option>
            ))}
          </select>
          <p className="text-xs text-stone-400 mt-1">
            {linkableOrders.length === 0
              ? 'No hay pedidos confirmados disponibles.'
              : 'Al vincular, el pedido cambiará automáticamente a En producción. Al finalizar la orden, el pedido pasará a Listo.'}
          </p>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Instrucciones especiales..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-stone-200 dark:border-stone-700">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando...' : 'Crear orden'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductionPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewId, setViewId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['production', page, limit, statusFilter],
    queryFn: () => productionService.getAll({
      page, limit, status: statusFilter as ProductionStatus || undefined,
    }),
  });

  // Real counts per status — 4 stable queries (hooks must not be in loops)
  const countPending = useQuery({
    queryKey: ['production-count', 'PENDING'],
    queryFn: () => productionService.getAll({ limit: 1, status: 'PENDING' as ProductionStatus }),
    select: (d: any) => d?.meta?.total ?? 0,
  });
  const countPreparing = useQuery({
    queryKey: ['production-count', 'PREPARING'],
    queryFn: () => productionService.getAll({ limit: 1, status: 'PREPARING' as ProductionStatus }),
    select: (d: any) => d?.meta?.total ?? 0,
  });
  const countDecorating = useQuery({
    queryKey: ['production-count', 'DECORATING'],
    queryFn: () => productionService.getAll({ limit: 1, status: 'DECORATING' as ProductionStatus }),
    select: (d: any) => d?.meta?.total ?? 0,
  });
  const countFinished = useQuery({
    queryKey: ['production-count', 'FINISHED'],
    queryFn: () => productionService.getAll({ limit: 1, status: 'FINISHED' as ProductionStatus }),
    select: (d: any) => d?.meta?.total ?? 0,
  });
  const statusCounts = [countPending, countPreparing, countDecorating, countFinished];

  const columns = [
    {
      key: 'orderNumber',
      header: 'N° Orden',
      render: (o: any) => (
        <span className="font-mono text-sm font-semibold text-primary-600">{o.orderNumber}</span>
      ),
    },
    {
      key: 'product',
      header: 'Producto',
      render: (o: any) => (
        <div>
          <p className="font-medium">{o.recipe?.product?.name ?? '—'}</p>
          <p className="text-xs text-stone-400">
            {o.recipe?.product?.category?.name ?? 'Sin categoría'}
          </p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (o: any) => (
        <span className="font-semibold">{o.quantity} <span className="text-stone-400 text-xs font-normal">unid.</span></span>
      ),
    },
    {
      key: 'assignee',
      header: 'Pastelero',
      render: (o: any) =>
        o.assignee
          ? (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-sm">{o.assignee.firstName} {o.assignee.lastName}</span>
            </div>
          )
          : <span className="text-stone-400 text-xs italic">Sin asignar</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (o: any) => {
        const Icon = STEP_ICONS[FLOW.indexOf(o.status)];
        return (
          <span className={cn('badge flex items-center gap-1', PRODUCTION_STATUS_COLORS[o.status])}>
            {Icon && <Icon className="w-3 h-3" />}
            {PRODUCTION_STATUS_LABELS[o.status]}
          </span>
        );
      },
    },
    {
      key: 'dates',
      header: 'Fechas',
      render: (o: any) => (
        <div className="text-xs text-stone-500 space-y-0.5">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {o.startDate ? formatDate(o.startDate) : <span className="italic">No iniciado</span>}
          </div>
          {o.endDate && (
            <div className="text-green-600 font-medium">✓ {formatDate(o.endDate)}</div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (o: any) => (
        <button
          onClick={() => setViewId(o.id)}
          className="btn-ghost p-1.5 text-stone-500 hover:text-primary-600"
          title="Ver detalle"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Producción"
        subtitle={`${data?.meta?.total ?? 0} órdenes de producción`}
        actions={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Nueva orden
          </button>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {FLOW.map((s, i) => {
          const Icon = STEP_ICONS[i];
          const count = statusCounts[i].data ?? 0;
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(isActive ? '' : s)}
              className={cn(
                'card p-4 text-left transition-all hover:shadow-md',
                isActive && 'ring-2 ring-primary-500',
              )}
            >
              <div className={cn('badge mb-2 flex items-center gap-1 w-fit', PRODUCTION_STATUS_COLORS[s])}>
                <Icon className="w-3 h-3" />
                {PRODUCTION_STATUS_LABELS[s]}
              </div>
              <p className="text-2xl font-bold text-stone-800 dark:text-stone-200">{count}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {isActive ? 'Filtrando este estado' : 'Clic para filtrar'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      {statusFilter && (
        <div className="card p-3 flex items-center gap-3">
          <span className="text-sm text-stone-600 dark:text-stone-400">
            Filtrando: <strong>{PRODUCTION_STATUS_LABELS[statusFilter as ProductionStatus]}</strong>
          </span>
          <button
            onClick={() => setStatusFilter('')}
            className="text-xs text-rose-500 hover:underline"
          >
            Quitar filtro
          </button>
        </div>
      )}

      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        emptyMessage="No hay órdenes de producción"
      />

      {/* Detail modal */}
      {viewId && (
        <Modal
          isOpen={!!viewId}
          onClose={() => setViewId(null)}
          title="Detalle de producción"
          size="lg"
        >
          <ProductionDetailView orderId={viewId} onClose={() => setViewId(null)} />
        </Modal>
      )}

      {/* Create modal */}
      <CreateProductionModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
