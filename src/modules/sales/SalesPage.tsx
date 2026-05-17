import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Eye, ShoppingCart, CreditCard, Banknote, QrCode, ArrowLeftRight,
  Plus, Minus, Trash2, UserCircle, X, Tag, StickyNote, Percent, PackageCheck, AlertCircle,
} from 'lucide-react';
import { salesService, customersService } from '@/services/index';
import { productsService } from '@/services/products.service';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from '@/lib/utils';
import type { Sale, Customer } from '@/types';
import toast from '@/lib/toast';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  itemDiscount: number;
  stock: number;
}

const PAYMENT_ICONS: Record<string, any> = {
  CASH: Banknote, QR: QrCode, CARD: CreditCard, TRANSFER: ArrowLeftRight,
};

export default function SalesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [posOpen, setPosOpen] = useState(false);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  // POS state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'QR' | 'TRANSFER'>('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Queries principales
  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, limit, search, statusFilter],
    queryFn: () => salesService.getAll({ page, limit, search, status: statusFilter === 'ALL' ? undefined : statusFilter }),
  });

  const { data: dailySummary } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: () => salesService.getDailySummary(),
    refetchInterval: 60000,
  });

  // Queries POS (solo cuando el modal está abierto)
  const { data: productsData } = useQuery({
    queryKey: ['products-for-pos'],
    queryFn: () => productsService.getAll({ limit: 200, isActive: 'true' }),
    enabled: posOpen,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-for-pos'],
    queryFn: () => productsService.getCategories(),
    enabled: posOpen,
  });

  const { data: customersFound } = useQuery({
    queryKey: ['customers-search-pos', customerSearch],
    queryFn: () => customersService.getAll({ search: customerSearch, limit: 8 }),
    enabled: posOpen && customerSearch.trim().length >= 1,
  });


  // Mutation para completar venta pendiente
  const completeMutation = useMutation({
    mutationFn: (id: string) => salesService.completeSale(id),
    onSuccess: () => {
      toast.success('Venta completada y stock descontado');
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'No se pudo completar la venta';
      toast.error(msg);
    },
  });

  // Cálculos del carrito
  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity - i.itemDiscount, 0),
    [cart],
  );
  const discountAmount = parseFloat(globalDiscount) || 0;
  const total = Math.max(0, subtotal - discountAmount);
  const paid = parseFloat(amountPaid) || 0;
  const change = paymentMethod === 'CASH' ? Math.max(0, paid - total) : 0;
  const canProcess = cart.length > 0 && (paymentMethod !== 'CASH' || paid >= total);
  const hasPendingItems = cart.some((i) => i.quantity > i.stock);

  // Productos filtrados
  const filteredProducts = useMemo(() => {
    const all = productsData?.data ?? [];
    return all.filter((p: any) => {
      const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchSearch = !posSearch.trim() || p.name.toLowerCase().includes(posSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [productsData, selectedCategory, posSearch]);

  // Acciones del carrito
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (product.stock > 0 && existing.quantity >= product.stock) return prev;
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, name: product.name, price: Number(product.price), quantity: 1, itemDiscount: 0, stock: product.stock }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.productId !== productId) return i;
      const newQty = Math.max(1, i.quantity + delta);
      // Only cap at stock if the item actually has stock
      const capped = i.stock > 0 ? Math.min(i.stock, newQty) : newQty;
      return { ...i, quantity: capped };
    }));
  };

  const setItemDiscount = (productId: string, val: string) => {
    const d = parseFloat(val) || 0;
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, itemDiscount: d } : i));
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const closePos = () => {
    setPosOpen(false);
    setCart([]);
    setPosSearch('');
    setSelectedCategory('all');
    setPaymentMethod('CASH');
    setAmountPaid('');
    setPaymentReference('');
    setGlobalDiscount('');
    setNotes('');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  // Mutación de venta
  const saleMutation = useMutation({
    mutationFn: () => {
      const paymentAmount = paymentMethod === 'CASH' ? Math.max(paid, total) : total;
      return salesService.create({
        customerId: selectedCustomer?.id,
        discount: discountAmount || undefined,
        notes: notes.trim() || undefined,
        details: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.price,
          discount: i.itemDiscount || undefined,
        })),
        payments: [{
          method: paymentMethod,
          amount: paymentAmount,
          reference: paymentReference.trim() || undefined,
        }],
      });
    },
    onSuccess: () => {
      toast.success('Venta registrada correctamente');
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
      closePos();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Error al procesar la venta';
      toast.error(msg);
    },
  });

  // Tabla de historial
  const SALE_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    COMPLETED: { label: 'Completada', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    PENDING:   { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    REFUNDED:  { label: 'Reembolsada', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  };

  const columns = [
    { key: 'saleNumber', header: 'N° Venta', render: (s: Sale) => <span className="font-mono text-sm font-semibold text-primary-600">{s.saleNumber}</span> },
    { key: 'customer', header: 'Cliente', render: (s: Sale) => s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : <span className="text-stone-400 italic">Sin cliente</span> },
    { key: 'items', header: 'Productos', render: (s: Sale) => `${s.saleDetails?.length ?? 0} items` },
    {
      key: 'payments', header: 'Método', render: (s: Sale) => (
        <div className="flex gap-1 flex-wrap">
          {s.payments?.map((p, i) => {
            const Icon = PAYMENT_ICONS[p.method];
            return <span key={i} className="badge bg-stone-100 dark:bg-stone-800 flex items-center gap-1"><Icon className="w-3 h-3" />{PAYMENT_METHOD_LABELS[p.method]}</span>;
          })}
        </div>
      ),
    },
    { key: 'total', header: 'Total', render: (s: Sale) => <span className="font-bold text-emerald-600">{formatCurrency(s.total)}</span> },
    {
      key: 'status', header: 'Estado', render: (s: Sale) => {
        const st = SALE_STATUS_LABELS[s.status] ?? { label: s.status, cls: '' };
        return <span className={`badge text-xs font-medium ${st.cls}`}>{st.label}</span>;
      },
    },
    { key: 'createdAt', header: 'Fecha', render: (s: Sale) => formatDateTime(s.createdAt) },
    {
      key: 'actions', header: '', render: (s: Sale) => (
        <div className="flex items-center gap-1">
          {s.status === 'PENDING' && (
            <button
              onClick={() => completeMutation.mutate(s.id)}
              disabled={completeMutation.isPending}
              title="Marcar como entregado"
              className="btn-ghost p-1.5 text-amber-500 hover:text-emerald-600">
              <PackageCheck className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setViewSale(s)} className="btn-ghost p-1.5 text-stone-500 hover:text-primary-600"><Eye className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Ventas" subtitle="Registro de ventas y caja"
        actions={<button className="btn-primary" onClick={() => setPosOpen(true)}><ShoppingCart className="w-4 h-4" /> Nueva venta (POS)</button>} />

      {/* Resumen diario */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-stone-500 mb-1">Ventas hoy</p>
          <p className="text-3xl font-bold text-stone-900 dark:text-white">{dailySummary?.totalSales ?? 0}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-stone-500 mb-1">Ingresos hoy</p>
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(dailySummary?.totalRevenue ?? 0)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-stone-500 mb-2">Por método de pago</p>
          <div className="space-y-1">
            {dailySummary?.byPaymentMethod?.map((m: any) => (
              <div key={m.method} className="flex justify-between text-sm">
                <span className="text-stone-600">{PAYMENT_METHOD_LABELS[m.method]}</span>
                <span className="font-semibold">{formatCurrency(m._sum.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-9" placeholder="Buscar ventas..." />
        </div>
        <div className="flex gap-1.5">
          {(['ALL', 'PENDING', 'COMPLETED'] as const).map((s) => {
            const labels = { ALL: 'Todas', PENDING: 'Pendientes', COMPLETED: 'Completadas' };
            const active = statusFilter === s;
            return (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? 'bg-primary-600 text-white border-primary-600' : 'border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:border-primary-400'}`}>
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      <Table columns={columns} data={data?.data ?? []} loading={isLoading} meta={data?.meta} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} emptyMessage="No hay ventas registradas" />

      {/* Modal detalle venta */}
      {viewSale && (
        <Modal isOpen={!!viewSale} onClose={() => setViewSale(null)} title={`Venta ${viewSale.saleNumber}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="label">Cliente</p><p>{viewSale.customer ? `${viewSale.customer.firstName} ${viewSale.customer.lastName}` : 'Sin cliente'}</p></div>
              <div><p className="label">Vendedor</p><p>{viewSale.user?.firstName} {viewSale.user?.lastName}</p></div>
              <div><p className="label">Subtotal</p><p>{formatCurrency(viewSale.subtotal)}</p></div>
              <div><p className="label">Descuento</p><p>{formatCurrency(viewSale.discount)}</p></div>
              <div><p className="label">Impuesto</p><p>{formatCurrency(viewSale.tax)}</p></div>
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

      {/* ===== MODAL POS ===== */}
      <Modal isOpen={posOpen} onClose={closePos} title="Punto de Venta (POS)" size="2xl">
        <div className="flex gap-5" style={{ minHeight: '560px' }}>

          {/* ── Panel izquierdo: catálogo ── */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* Búsqueda de producto */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                className="input pl-9"
                placeholder="Buscar producto..."
              />
            </div>

            {/* Filtro por categoría */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${selectedCategory === 'all' ? 'bg-primary-600 text-white border-primary-600' : 'border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:border-primary-400'}`}>
                Todos
              </button>
              {(categoriesData ?? []).map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${selectedCategory === cat.id ? 'bg-primary-600 text-white border-primary-600' : 'border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:border-primary-400'}`}>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Grid de productos */}
            <div className="grid grid-cols-3 gap-2 overflow-y-auto scrollbar-thin pr-1" style={{ maxHeight: '420px' }}>
              {filteredProducts.map((p: any) => {
                const inCart = cart.find((i) => i.productId === p.id);
                const noStock = p.stock === 0;
                const lowStock = p.stock > 0 && p.stock <= 5;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`card p-3 text-left transition-all active:scale-95 ${noStock ? 'border-amber-300 dark:border-amber-700' : inCart ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'hover:border-primary-300 hover:shadow-md'}`}>
                    <p className="text-xs text-stone-400 truncate mb-0.5">{p.category?.name}</p>
                    <p className="text-sm font-medium leading-tight">{p.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-primary-600 font-bold text-sm">{formatCurrency(p.price)}</p>
                      {inCart && (
                        <span className="badge bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs">×{inCart.quantity}</span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 font-medium ${noStock ? 'text-amber-500' : lowStock ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {noStock ? 'Sin stock (pendiente)' : `Stock: ${p.stock}`}
                    </p>
                  </button>
                );
              })}
              {filteredProducts.length === 0 && (
                <p className="col-span-3 text-center text-stone-400 text-sm py-12">Sin productos</p>
              )}
            </div>
          </div>

          {/* ── Panel derecho: orden ── */}
          <div className="flex flex-col gap-3 w-80 flex-shrink-0">

            {/* Selector de cliente */}
            <div ref={customerRef} className="relative">
              <p className="label flex items-center gap-1.5 mb-1"><UserCircle className="w-3.5 h-3.5" /> Cliente</p>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary-300 bg-primary-50 dark:bg-primary-900/20">
                  <div>
                    <p className="text-sm font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                    {selectedCustomer.phone && <p className="text-xs text-stone-500">{selectedCustomer.phone}</p>}
                  </div>
                  <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="btn-ghost p-1 text-stone-400 hover:text-rose-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
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
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDropdown(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                            <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-stone-500">{c.phone}{c.email ? ` · ${c.email}` : ''}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Carrito */}
            <div>
              <p className="label flex items-center gap-1.5 mb-1"><ShoppingCart className="w-3.5 h-3.5" /> Orden</p>
              <div className="card divide-y divide-stone-100 dark:divide-stone-800 overflow-y-auto scrollbar-thin" style={{ maxHeight: '220px' }}>
                {cart.length === 0 ? (
                  <p className="p-5 text-center text-stone-400 text-sm">Selecciona productos del catálogo</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.productId} className="p-2 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{item.name}</p>
                          {item.quantity > item.stock && (
                            <p className="text-xs text-amber-500 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Pendiente de producción
                            </p>
                          )}
                        </div>
                        <button onClick={() => removeFromCart(item.productId)} className="text-stone-300 hover:text-rose-500 transition-colors flex-shrink-0 mt-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 flex items-center justify-center rounded border border-stone-300 dark:border-stone-600 hover:border-primary-400 transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                          <button onClick={() => updateQty(item.productId, 1)} disabled={item.stock > 0 && item.quantity >= item.stock} className="w-6 h-6 flex items-center justify-center rounded border border-stone-300 dark:border-stone-600 hover:border-primary-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-stone-400 flex items-center gap-0.5"><Tag className="w-3 h-3" /></span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Desc."
                            value={item.itemDiscount || ''}
                            onChange={(e) => setItemDiscount(item.productId, e.target.value)}
                            className="w-16 text-xs border border-stone-300 dark:border-stone-600 rounded px-1.5 py-0.5 bg-white dark:bg-stone-800 focus:outline-none focus:border-primary-400"
                          />
                          <span className="text-sm font-bold w-20 text-right">{formatCurrency(item.price * item.quantity - item.itemDiscount)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Descuento global y notas */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label flex items-center gap-1"><Percent className="w-3 h-3" /> Descuento</label>
                <input
                  type="number" min="0" placeholder="0.00"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(e.target.value)}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notas</label>
                <input
                  placeholder="Observaciones..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>

            {/* Método de pago */}
            <div>
              <p className="label mb-1">Método de pago</p>
              <div className="grid grid-cols-4 gap-1">
                {(['CASH', 'CARD', 'QR', 'TRANSFER'] as const).map((m) => {
                  const Icon = PAYMENT_ICONS[m];
                  return (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${paymentMethod === m ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-primary-300'}`}>
                      <Icon className="w-4 h-4" />
                      {PAYMENT_METHOD_LABELS[m]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monto pagado / referencia */}
            {paymentMethod === 'CASH' ? (
              <div>
                <label className="label">Monto recibido</label>
                <input
                  type="number" min="0" placeholder={total.toFixed(2)}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="input"
                />
                {paid > 0 && paid >= total && (
                  <p className="text-sm text-emerald-600 font-semibold mt-1">Cambio: {formatCurrency(change)}</p>
                )}
                {paid > 0 && paid < total && (
                  <p className="text-sm text-rose-500 mt-1">Faltan {formatCurrency(total - paid)}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="label">Referencia / N° operación</label>
                <input
                  placeholder="Opcional"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="input"
                />
              </div>
            )}

            {/* Totales */}
            <div className="border-t border-stone-200 dark:border-stone-700 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-stone-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Descuento</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xl">
                <span>Total</span>
                <span className="text-emerald-600">{formatCurrency(total)}</span>
              </div>
              {hasPendingItems && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Hay productos sin stock. El pago se registra ahora y la venta quedará <strong>pendiente de entrega</strong> hasta que haya producción.</span>
                </div>
              )}
              <button
                className="btn-primary w-full py-3 text-base mt-2"
                disabled={!canProcess || saleMutation.isPending}
                onClick={() => saleMutation.mutate()}>
                {saleMutation.isPending ? 'Procesando...' : hasPendingItems ? 'Registrar venta (pendiente)' : 'Registrar venta'}
              </button>
            </div>

          </div>
        </div>
      </Modal>
    </div>
  );
}
