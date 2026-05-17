import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Package, Tag } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { productsService } from '@/services/products.service';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Badge from '@/components/ui/Badge';
import ImageUpload from '@/components/ui/ImageUpload';
import { formatCurrency, getApiError } from '@/lib/utils';
import type { Product, Category } from '@/types';
import toast from '@/lib/toast';

// ─── Schemas ────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  price: z.number({ invalid_type_error: 'El precio debe ser un número' }).min(0.01, 'El precio debe ser mayor a 0'),
  cost: z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v as number) ? undefined : v),
    z.number({ invalid_type_error: 'El costo debe ser un número' }).min(0, 'El costo no puede ser negativo').optional()
  ),
  categoryId: z.string().uuid('Selecciona una categoría válida'),
  imageUrl: z.string().optional(),
}).refine(
  (data) => data.cost === undefined || data.cost <= data.price,
  { message: 'El costo no puede ser mayor al precio de venta', path: ['cost'] }
);

const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;
type CategoryForm = z.infer<typeof categorySchema>;

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = 'products' | 'categories';

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab({ categories }: { categories: Category[] }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, limit, search, categoryFilter],
    queryFn: () => productsService.getAll({ page, limit, search, categoryId: categoryFilter || undefined }),
  });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (data: ProductForm) => {
      const payload = { ...data, imageUrl: data.imageUrl || undefined };
      return editingProduct
        ? productsService.update(editingProduct.id, payload)
        : productsService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
      setModalOpen(false);
      reset();
      setEditingProduct(null);
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: productsService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto eliminado');
      setDeletingProduct(null);
    },
    onError: () => toast.error('Error al eliminar'),
  });

  useEffect(() => {
    if (!modalOpen) return;
    if (editingProduct) {
      reset({
        name: editingProduct.name,
        description: editingProduct.description,
        price: Number(editingProduct.price),
        cost: editingProduct.cost ? Number(editingProduct.cost) : undefined,
        categoryId: editingProduct.categoryId,
        imageUrl: editingProduct.imageUrl || '',
      });
    } else {
      reset({ name: '', description: '', price: undefined, cost: undefined, categoryId: '', imageUrl: '' });
    }
  }, [modalOpen, editingProduct?.id]);

  const openCreate = () => { setEditingProduct(null); setModalOpen(true); };
  const openEdit = (p: Product) => { setEditingProduct(p); setModalOpen(true); };

  const columns = [
    {
      key: 'name', header: 'Producto', render: (p: Product) => (
        <div className="flex items-center gap-3">
          {p.imageUrl ? (
            <img
              src={p.imageUrl}
              alt={p.name}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-stone-200 dark:border-stone-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
          )}
          <div>
            <p className="font-medium text-stone-800 dark:text-stone-200">{p.name}</p>
            <p className="text-xs text-stone-500">{p.category?.name}</p>
          </div>
        </div>
      ),
    },
    { key: 'price', header: 'Precio', render: (p: Product) => <span className="font-semibold text-stone-800 dark:text-stone-200">{formatCurrency(p.price)}</span> },
    { key: 'cost', header: 'Costo', render: (p: Product) => p.cost ? formatCurrency(p.cost) : '—' },
    {
      key: 'stock', header: 'Stock', render: (p: Product) => {
        const s = p.stock ?? 0;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            s === 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
            : s <= 5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}>
            {s === 0 ? 'Sin stock' : s}
          </span>
        );
      },
    },
    {
      key: 'isActive', header: 'Estado', render: (p: Product) => (
        <Badge variant={p.isActive ? 'success' : 'danger'}>{p.isActive ? 'Activo' : 'Inactivo'}</Badge>
      ),
    },
    {
      key: 'actions', header: '', render: (p: Product) => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => openEdit(p)} className="btn-ghost p-1.5 rounded-lg text-stone-500 hover:text-primary-600">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => setDeletingProduct(p)} className="btn-ghost p-1.5 rounded-lg text-stone-500 hover:text-rose-600">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9"
            placeholder="Buscar productos..."
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="input max-w-xs"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nuevo producto
        </button>
      </div>

      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        emptyMessage="No hay productos"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProduct(null); }}
        title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input {...register('name')} className="input" placeholder="Torta de chocolate" />
            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea {...register('description')} className="input resize-none" rows={2} placeholder="Descripción del producto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Precio (Bs) *</label>
              <input {...register('price', { valueAsNumber: true })} type="number" step="0.01" className="input" placeholder="0.00" />
              {errors.price && <p className="mt-1 text-xs text-rose-500">{errors.price.message}</p>}
            </div>
            <div>
              <label className="label">Costo (Bs)</label>
              <input {...register('cost', { valueAsNumber: true })} type="number" step="0.01" className="input" placeholder="0.00" />
              {errors.cost && <p className="mt-1 text-xs text-rose-500">{errors.cost.message as string}</p>}
            </div>
          </div>
          <div>
            <label className="label">Categoría *</label>
            <select {...register('categoryId')} className="input">
              <option value="">Seleccionar categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className="mt-1 text-xs text-rose-500">{errors.categoryId.message}</p>}
          </div>
          <div>
            <label className="label">Imagen</label>
            <Controller
              name="imageUrl"
              control={control}
              render={({ field }) => (
                <ImageUpload value={field.value} onChange={(url) => field.onChange(url ?? '')} />
              )}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); setEditingProduct(null); }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => deletingProduct && deleteMutation.mutate(deletingProduct.id)}
        title="¿Eliminar producto?"
        description={`Se eliminará "${deletingProduct?.name}" de forma permanente. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        loading={deleteMutation.isPending}
      />
    </>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

function CategoriesTab() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: productsService.getCategories,
  });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  });

  const saveMutation = useMutation({
    mutationFn: (data: CategoryForm) => {
      const payload = { ...data, imageUrl: data.imageUrl || undefined };
      return editingCategory
        ? productsService.updateCategory(editingCategory.id, payload)
        : productsService.createCategory(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success(editingCategory ? 'Categoría actualizada' : 'Categoría creada');
      setModalOpen(false);
      reset();
      setEditingCategory(null);
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: productsService.removeCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoría eliminada');
      setDeletingCategory(null);
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  useEffect(() => {
    if (!modalOpen) return;
    if (editingCategory) {
      reset({ name: editingCategory.name, description: editingCategory.description, imageUrl: editingCategory.imageUrl || '' });
    } else {
      reset({ name: '', description: '', imageUrl: '' });
    }
  }, [modalOpen, editingCategory?.id]);

  const openCreate = () => { setEditingCategory(null); setModalOpen(true); };
  const openEdit = (c: Category) => { setEditingCategory(c); setModalOpen(true); };

  const columns = [
    {
      key: 'name', header: 'Categoría', render: (c: Category) => (
        <div className="flex items-center gap-3">
          {c.imageUrl ? (
            <img
              src={c.imageUrl}
              alt={c.name}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-stone-200 dark:border-stone-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <Tag className="w-5 h-5 text-amber-600" />
            </div>
          )}
          <div>
            <p className="font-medium text-stone-800 dark:text-stone-200">{c.name}</p>
            {c.description && <p className="text-xs text-stone-500">{c.description}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'products', header: 'Productos', render: (c: Category) => (
        <span className="text-sm text-stone-600 dark:text-stone-400">{c._count?.products ?? 0} productos</span>
      ),
    },
    {
      key: 'isActive', header: 'Estado', render: (c: Category) => (
        <Badge variant={c.isActive ? 'success' : 'danger'}>{c.isActive ? 'Activa' : 'Inactiva'}</Badge>
      ),
    },
    {
      key: 'actions', header: '', render: (c: Category) => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => openEdit(c)} className="btn-ghost p-1.5 rounded-lg text-stone-500 hover:text-primary-600">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => setDeletingCategory(c)} className="btn-ghost p-1.5 rounded-lg text-stone-500 hover:text-rose-600">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end">
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nueva categoría
        </button>
      </div>

      <Table
        columns={columns}
        data={categories ?? []}
        loading={isLoading}
        emptyMessage="No hay categorías"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCategory(null); }}
        title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input {...register('name')} className="input" placeholder="Tortas" />
            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea {...register('description')} className="input resize-none" rows={2} placeholder="Descripción de la categoría" />
          </div>
          <div>
            <label className="label">Imagen</label>
            <Controller
              name="imageUrl"
              control={control}
              render={({ field }) => (
                <ImageUpload value={field.value} onChange={(url) => field.onChange(url ?? '')} />
              )}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); setEditingCategory(null); }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : editingCategory ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
        title="¿Eliminar categoría?"
        description={`Se eliminará "${deletingCategory?.name}". Si tiene productos asociados no se podrá eliminar.`}
        confirmLabel="Sí, eliminar"
        loading={deleteMutation.isPending}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('products');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: productsService.getCategories,
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'products', label: 'Productos', icon: <Package className="w-4 h-4" /> },
    { key: 'categories', label: 'Categorías', icon: <Tag className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Productos" subtitle="Gestión de productos y categorías" />

      {/* Tabs */}
      <div className="border-b border-stone-200 dark:border-stone-700">
        <nav className="-mb-px flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'products' && <ProductsTab categories={categories ?? []} />}
      {activeTab === 'categories' && <CategoriesTab />}
    </div>
  );
}
