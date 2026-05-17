import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { inventoryService } from '@/services/index';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Badge from '@/components/ui/Badge';
import type { Ingredient } from '@/types';
import toast from '@/lib/toast';
import { cn } from '@/lib/utils';

const optNum = (min: number, msg: string) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().min(min, msg).optional());

const ingredientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  unit: z.string().min(1, 'La unidad de medida es requerida'),
  stock: optNum(0, 'El stock no puede ser negativo'),
  minStock: optNum(0, 'El stock mínimo no puede ser negativo'),
  cost: optNum(0, 'El costo no puede ser negativo'),
});

const movementSchema = z.object({
  type: z.enum(['ENTRY', 'EXIT', 'ADJUSTMENT'], { message: 'El tipo de movimiento no es válido' }),
  quantity: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ required_error: 'La cantidad es requerida' }).min(0.001, 'La cantidad debe ser mayor a 0')
  ),
  reason: z.string().optional(),
  reference: z.string().optional(),
});

type IngredientFormData = z.infer<typeof ingredientSchema>;
type MovementFormData = z.infer<typeof movementSchema>;

export default function InventoryPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [ingredientModal, setIngredientModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [deletingIngredient, setDeletingIngredient] = useState<Ingredient | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ingredients', page, limit, search, showLowStock],
    queryFn: () => inventoryService.getAll({ page, limit, search, lowStock: showLowStock ? 'true' : undefined }),
  });

  const { register: regIng, handleSubmit: handleIng, reset: resetIng, formState: { errors: ingErrors } } = useForm<IngredientFormData>({ resolver: zodResolver(ingredientSchema) });
  const { register: regMov, handleSubmit: handleMov, reset: resetMov, formState: { errors: movErrors } } = useForm<MovementFormData>({ resolver: zodResolver(movementSchema) });

  const ingredientMutation = useMutation({
    mutationFn: (dto: any) => editingIngredient
      ? inventoryService.update(editingIngredient.id, dto)
      : inventoryService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredients'] });
      toast.success(editingIngredient ? 'Ingrediente actualizado' : 'Ingrediente creado');
      setIngredientModal(false); resetIng(); setEditingIngredient(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  });

  const movementMutation = useMutation({
    mutationFn: (dto: any) => inventoryService.createMovement({ ...dto, ingredientId: selectedIngredient?.id, quantity: Number(dto.quantity) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredients'] });
      toast.success('Movimiento registrado');
      setMovementModal(false); resetMov(); setSelectedIngredient(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Ingrediente eliminado'); setDeletingIngredient(null); },
  });

  useEffect(() => {
    if (!ingredientModal) return;
    if (editingIngredient) {
      resetIng({ name: editingIngredient.name, unit: editingIngredient.unit, stock: Number(editingIngredient.stock), minStock: Number(editingIngredient.minStock), cost: Number(editingIngredient.cost) });
    } else {
      resetIng({ name: '', unit: '', stock: undefined, minStock: undefined, cost: undefined });
    }
  }, [ingredientModal, editingIngredient?.id]);

  useEffect(() => {
    if (!movementModal) { resetMov({}); }
  }, [movementModal]);

  const openEdit = (i: Ingredient) => { setEditingIngredient(i); setIngredientModal(true); };

  const columns = [
    { key: 'name', header: 'Ingrediente', render: (i: Ingredient) => (
      <div className="flex items-center gap-2">
        {i.isLowStock && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
        <div>
          <p className="font-medium">{i.name}</p>
          {i.description && <p className="text-xs text-stone-500">{i.description}</p>}
        </div>
      </div>
    )},
    { key: 'stock', header: 'Stock', render: (i: Ingredient) => (
      <span className={cn('font-semibold', i.isLowStock ? 'text-amber-600' : 'text-stone-800 dark:text-stone-200')}>
        {Number(i.stock).toFixed(2)} {i.unit}
      </span>
    )},
    { key: 'minStock', header: 'Stock mín.', render: (i: Ingredient) => `${Number(i.minStock).toFixed(2)} ${i.unit}` },
    { key: 'status', header: 'Estado', render: (i: Ingredient) => (
      <Badge variant={i.isLowStock ? 'warning' : 'success'}>{i.isLowStock ? 'Stock bajo' : 'Normal'}</Badge>
    )},
    { key: 'actions', header: '', render: (i: Ingredient) => (
      <div className="flex items-center gap-2 justify-end">
        <button title="Entrada" onClick={() => { setSelectedIngredient(i); resetMov({ type: 'ENTRY' }); setMovementModal(true); }}
          className="btn-ghost p-1.5 text-emerald-500 hover:text-emerald-700"><ArrowUpCircle className="w-4 h-4" /></button>
        <button title="Salida" onClick={() => { setSelectedIngredient(i); resetMov({ type: 'EXIT' }); setMovementModal(true); }}
          className="btn-ghost p-1.5 text-rose-500 hover:text-rose-700"><ArrowDownCircle className="w-4 h-4" /></button>
        <button onClick={() => openEdit(i)} className="btn-ghost p-1.5 text-stone-500 hover:text-primary-600"><Edit className="w-4 h-4" /></button>
        <button onClick={() => setDeletingIngredient(i)}
          className="btn-ghost p-1.5 text-stone-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario" subtitle={`${data?.meta?.total ?? 0} ingredientes`}
        actions={<button className="btn-primary" onClick={() => { setEditingIngredient(null); setIngredientModal(true); }}><Plus className="w-4 h-4" /> Nuevo ingrediente</button>} />

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-9" placeholder="Buscar ingredientes..." />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showLowStock} onChange={(e) => setShowLowStock(e.target.checked)} className="rounded border-stone-300" />
          <span className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Solo stock bajo
          </span>
        </label>
      </div>

      <Table columns={columns} data={data?.data ?? []} loading={isLoading} meta={data?.meta} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} emptyMessage="No hay ingredientes" />

      <ConfirmModal
        isOpen={!!deletingIngredient}
        onClose={() => setDeletingIngredient(null)}
        onConfirm={() => deletingIngredient && deleteMutation.mutate(deletingIngredient.id)}
        title="¿Eliminar ingrediente?"
        description={`Se eliminará "${deletingIngredient?.name}" del inventario. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        loading={deleteMutation.isPending}
      />

      <Modal isOpen={ingredientModal} onClose={() => { setIngredientModal(false); setEditingIngredient(null); }} title={editingIngredient ? 'Editar ingrediente' : 'Nuevo ingrediente'}>
        <form onSubmit={handleIng((d) => ingredientMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input {...regIng('name')} className="input" placeholder="Harina de trigo" />
            {ingErrors.name && <p className="mt-1 text-xs text-rose-500">{ingErrors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unidad *</label>
              <input {...regIng('unit')} className="input" placeholder="kg, litro, unidad..." />
              {ingErrors.unit && <p className="mt-1 text-xs text-rose-500">{ingErrors.unit.message}</p>}
            </div>
            <div>
              <label className="label">Costo por unidad</label>
              <input {...regIng('cost')} type="number" step="0.01" className="input" placeholder="0.00" />
              {ingErrors.cost && <p className="mt-1 text-xs text-rose-500">{ingErrors.cost.message as string}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Stock inicial</label>
              <input {...regIng('stock')} type="number" step="0.001" className="input" />
              {ingErrors.stock && <p className="mt-1 text-xs text-rose-500">{ingErrors.stock.message as string}</p>}
            </div>
            <div>
              <label className="label">Stock mínimo</label>
              <input {...regIng('minStock')} type="number" step="0.001" className="input" />
              {ingErrors.minStock && <p className="mt-1 text-xs text-rose-500">{ingErrors.minStock.message as string}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setIngredientModal(false); setEditingIngredient(null); }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={ingredientMutation.isPending}>{ingredientMutation.isPending ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={movementModal} onClose={() => { setMovementModal(false); setSelectedIngredient(null); }} title={`Movimiento de inventario: ${selectedIngredient?.name}`}>
        <form onSubmit={handleMov((d) => movementMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Tipo de movimiento</label>
            <select {...regMov('type')} className="input">
              <option value="ENTRY">Entrada</option>
              <option value="EXIT">Salida</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </select>
            {movErrors.type && <p className="mt-1 text-xs text-rose-500">{movErrors.type.message}</p>}
          </div>
          <div>
            <label className="label">Cantidad ({selectedIngredient?.unit}) *</label>
            <input {...regMov('quantity')} type="number" step="0.001" className="input" placeholder="0.000" />
            {movErrors.quantity && <p className="mt-1 text-xs text-rose-500">{movErrors.quantity.message as string}</p>}
          </div>
          <div><label className="label">Motivo</label><input {...regMov('reason')} className="input" placeholder="Compra, uso en producción..." /></div>
          <div><label className="label">Referencia</label><input {...regMov('reference')} className="input" placeholder="N° de factura, pedido..." /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setMovementModal(false); setSelectedIngredient(null); }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={movementMutation.isPending}>{movementMutation.isPending ? 'Guardando...' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
