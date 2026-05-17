import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Trash2, DollarSign, ChefHat, Edit, Search, Clock, Package } from 'lucide-react';
import { recipesService, inventoryService } from '@/services/index';
import { productsService } from '@/services/products.service';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatCurrency, getApiError } from '@/lib/utils';
import type { Recipe } from '@/types';
import toast from '@/lib/toast';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ─── Schema ──────────────────────────────────────────────────────────────────

const optInt = (msg: string) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int(msg).optional()
  );

const recipeSchema = z.object({
  productId: z.string().min(1, 'Selecciona un producto'),
  description: z.string().optional(),
  yield: optInt('El rendimiento debe ser un número entero'),
  preparationTime: optInt('El tiempo debe ser un número entero'),
  instructions: z.string().optional(),
  details: z
    .array(
      z.object({
        ingredientId: z.string().min(1, 'Selecciona un ingrediente'),
        quantity: z.preprocess(
          (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
          z.number({ required_error: 'La cantidad es requerida' }).min(0.001, 'La cantidad debe ser mayor a 0')
        ),
        unit: z.string().min(1, 'La unidad es requerida'),
      })
    )
    .min(1, 'Se requiere al menos un ingrediente'),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

const EMPTY_DETAIL = { ingredientId: '', quantity: undefined as any, unit: '' };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecipesPage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  const [costData, setCostData] = useState<any>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null);

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: recipesRes, isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => recipesService.getAll(),
  });

  const { data: productsRes } = useQuery({
    queryKey: ['products-for-recipes'],
    queryFn: () => productsService.getAll({ limit: 200 }),
  });

  const { data: ingredientsRes } = useQuery({
    queryKey: ['ingredients-for-recipes'],
    queryFn: () => inventoryService.getAll({ limit: 200 }),
  });

  const allRecipes: Recipe[] = recipesRes?.data ?? [];
  const products = productsRes?.data ?? [];
  const ingredients = ingredientsRes?.data ?? [];

  const filteredRecipes = search.trim()
    ? allRecipes.filter((r) =>
        r.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.product?.category?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : allRecipes;

  // ─── Form ──────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: { details: [EMPTY_DETAIL] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'details' });

  useEffect(() => {
    if (!modalOpen) return;
    if (editingRecipe) {
      reset({
        productId: editingRecipe.productId,
        description: editingRecipe.description ?? '',
        yield: editingRecipe.yield ?? undefined,
        preparationTime: editingRecipe.preparationTime ?? undefined,
        instructions: editingRecipe.instructions ?? '',
        details: editingRecipe.recipeDetails?.length
          ? editingRecipe.recipeDetails.map((d) => ({
              ingredientId: d.ingredientId,
              quantity: Number(d.quantity),
              unit: d.unit,
            }))
          : [EMPTY_DETAIL],
      });
    } else {
      reset({ productId: '', description: '', yield: undefined, preparationTime: undefined, instructions: '', details: [EMPTY_DETAIL] });
    }
  }, [modalOpen, editingRecipe?.id]);

  const openCreate = () => { setEditingRecipe(null); setModalOpen(true); };
  const openEdit = (r: Recipe) => { setEditingRecipe(r); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingRecipe(null); };

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (dto: RecipeFormData) =>
      editingRecipe
        ? recipesService.update(editingRecipe.id, dto)
        : recipesService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success(editingRecipe ? 'Receta actualizada' : 'Receta creada');
      closeModal();
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recipesService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Receta eliminada');
      setDeletingRecipe(null);
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const loadCost = async (id: string) => {
    try {
      const c = await recipesService.calculateCost(id);
      setCostData(c);
    } catch {
      toast.error('Error al calcular el costo');
    }
  };

  // ─── Table columns ─────────────────────────────────────────────────────────

  const columns = [
    {
      key: 'product',
      header: 'Producto',
      render: (r: Recipe) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-stone-800 dark:text-stone-200">{r.product?.name}</p>
            <p className="text-xs text-stone-500">{r.product?.category?.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'yield',
      header: 'Rendimiento',
      render: (r: Recipe) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Package className="w-3.5 h-3.5 text-stone-400" />
          <span>{r.yield ?? '—'} unid.</span>
        </div>
      ),
    },
    {
      key: 'preparationTime',
      header: 'Tiempo prep.',
      render: (r: Recipe) => (
        <div className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          <span>{r.preparationTime ? `${r.preparationTime} min` : '—'}</span>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Ingredientes',
      render: (r: Recipe) => (
        <span className="text-sm text-stone-600 dark:text-stone-400">
          {r.recipeDetails?.length ?? 0} ingredientes
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r: Recipe) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            title="Ver detalle"
            onClick={() => setViewRecipe(r)}
            className="btn-ghost p-1.5 rounded-lg text-stone-500 hover:text-primary-600"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            title="Calcular costo"
            onClick={() => loadCost(r.id)}
            className="btn-ghost p-1.5 rounded-lg text-stone-500 hover:text-emerald-600"
          >
            <DollarSign className="w-4 h-4" />
          </button>
          <button
            title="Editar"
            onClick={() => openEdit(r)}
            className="btn-ghost p-1.5 rounded-lg text-stone-500 hover:text-primary-600"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            title="Eliminar"
            onClick={() => setDeletingRecipe(r)}
            className="btn-ghost p-1.5 rounded-lg text-stone-500 hover:text-rose-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recetas"
        subtitle={`${allRecipes.length} recetas registradas`}
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nueva receta
          </button>
        }
      />

      {/* Search bar */}
      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Buscar por producto o categoría..."
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredRecipes}
        loading={isLoading}
        emptyMessage="No hay recetas registradas"
      />

      {/* ── View detail modal ─────────────────────────────────────────────── */}
      {viewRecipe && (
        <Modal
          isOpen={!!viewRecipe}
          onClose={() => setViewRecipe(null)}
          title={`Receta: ${viewRecipe.product?.name}`}
          size="lg"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="label">Rendimiento</p>
                <p className="font-semibold">{viewRecipe.yield ?? '—'} unidades</p>
              </div>
              <div>
                <p className="label">Tiempo de preparación</p>
                <p className="font-semibold">
                  {viewRecipe.preparationTime ? `${viewRecipe.preparationTime} min` : '—'}
                </p>
              </div>
            </div>

            {viewRecipe.description && (
              <div>
                <p className="label">Descripción</p>
                <p className="text-sm text-stone-600 dark:text-stone-400">{viewRecipe.description}</p>
              </div>
            )}

            {viewRecipe.instructions && (
              <div>
                <p className="label">Instrucciones</p>
                <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap">
                  {viewRecipe.instructions}
                </p>
              </div>
            )}

            <div>
              <p className="label mb-2">
                Ingredientes ({viewRecipe.recipeDetails?.length ?? 0})
              </p>
              <div className="space-y-1.5">
                {viewRecipe.recipeDetails?.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-stone-800 rounded-lg text-sm"
                  >
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {d.ingredient?.name}
                    </span>
                    <span className="text-stone-500">
                      {Number(d.quantity).toFixed(3)} {d.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Cost analysis modal ───────────────────────────────────────────── */}
      {costData && (
        <Modal
          isOpen={!!costData}
          onClose={() => setCostData(null)}
          title="Análisis de costo"
        >
          <div className="space-y-4">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Receta: <span className="font-medium text-stone-700 dark:text-stone-300">{costData.recipe?.product?.name}</span>
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="card p-4 text-center">
                <p className="text-stone-500 text-xs mb-1">Costo total</p>
                <p className="text-2xl font-bold text-stone-900 dark:text-white">
                  {formatCurrency(costData.totalCost)}
                </p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-stone-500 text-xs mb-1">Costo por unidad</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(costData.costPerUnit)}
                </p>
              </div>
            </div>
            {costData.recipe?.product?.price && (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-center">
                <p className="text-sm text-stone-600 dark:text-stone-400">Margen de ganancia estimado</p>
                <p className="text-3xl font-bold text-primary-600 mt-1">
                  {(
                    ((Number(costData.recipe.product.price) - costData.costPerUnit) /
                      Number(costData.recipe.product.price)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Precio de venta: {formatCurrency(costData.recipe.product.price)}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deletingRecipe}
        onClose={() => setDeletingRecipe(null)}
        onConfirm={() => deletingRecipe && deleteMutation.mutate(deletingRecipe.id)}
        title="¿Eliminar receta?"
        description={`Se eliminará la receta de "${deletingRecipe?.product?.name}" de forma permanente. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        loading={deleteMutation.isPending}
      />

      {/* ── Create / Edit modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingRecipe ? `Editar receta: ${editingRecipe.product?.name}` : 'Nueva receta'}
        size="xl"
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          {/* Product */}
          <div>
            <label className="label">Producto *</label>
            <select {...register('productId')} className="input" disabled={!!editingRecipe}>
              <option value="">Seleccionar producto</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.productId && (
              <p className="mt-1 text-xs text-rose-500">{errors.productId.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="label">Descripción</label>
            <input {...register('description')} className="input" placeholder="Descripción breve de la receta" />
          </div>

          {/* Yield + Prep time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Rendimiento (unidades)</label>
              <input
                {...register('yield')}
                type="number"
                min={1}
                className="input"
                placeholder="1"
              />
              {errors.yield && (
                <p className="mt-1 text-xs text-rose-500">{errors.yield.message as string}</p>
              )}
            </div>
            <div>
              <label className="label">Tiempo de preparación (min)</label>
              <input
                {...register('preparationTime')}
                type="number"
                min={1}
                className="input"
                placeholder="60"
              />
              {errors.preparationTime && (
                <p className="mt-1 text-xs text-rose-500">{errors.preparationTime.message as string}</p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="label">Instrucciones</label>
            <textarea
              {...register('instructions')}
              className="input resize-none"
              rows={3}
              placeholder="Pasos de preparación..."
            />
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Ingredientes *</label>
              <button
                type="button"
                className="btn-secondary text-xs py-1"
                onClick={() => append(EMPTY_DETAIL)}
              >
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>

            {errors.details && !Array.isArray(errors.details) && (
              <p className="mb-2 text-xs text-rose-500">{(errors.details as any).message}</p>
            )}

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {fields.map((field, i) => (
                <div key={field.id} className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <select {...register(`details.${i}.ingredientId`)} className="input text-xs">
                        <option value="">Seleccionar ingrediente</option>
                        {ingredients.map((ing: any) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        {...register(`details.${i}.quantity`)}
                        type="number"
                        step="0.001"
                        min="0.001"
                        className="input text-xs"
                        placeholder="Cant."
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        {...register(`details.${i}.unit`)}
                        className="input text-xs"
                        placeholder="kg, litro..."
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        disabled={fields.length === 1}
                        className="btn-ghost p-1.5 text-rose-500 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {(errors.details?.[i]?.ingredientId ||
                    errors.details?.[i]?.quantity ||
                    errors.details?.[i]?.unit) && (
                    <p className="text-xs text-rose-500 pl-1">
                      {errors.details?.[i]?.ingredientId?.message ||
                        (errors.details?.[i]?.quantity as any)?.message ||
                        errors.details?.[i]?.unit?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-stone-100 dark:border-stone-700">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? 'Guardando...'
                : editingRecipe
                ? 'Actualizar receta'
                : 'Crear receta'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
