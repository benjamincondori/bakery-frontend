import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { customersService } from '@/services/index';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatDate, getApiError } from '@/lib/utils';
import type { Customer } from '@/types';
import toast from '@/lib/toast';

const schema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().min(7, 'El teléfono debe tener al menos 7 dígitos'),
  email: z.string().email('El email no es válido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CustomersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, limit, search],
    queryFn: () => customersService.getAll({ page, limit, search }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const saveMutation = useMutation({
    mutationFn: (dto: FormData) => {
      const payload = { ...dto, email: dto.email || undefined, address: dto.address || undefined, notes: dto.notes || undefined };
      return editingCustomer
        ? customersService.update(editingCustomer.id, payload)
        : customersService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success(editingCustomer ? 'Cliente actualizado' : 'Cliente creado');
      setModalOpen(false); reset(); setEditingCustomer(null);
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente eliminado');
      setDeletingCustomer(null);
    },
    onError: () => toast.error('Error al eliminar'),
  });

  useEffect(() => {
    if (!modalOpen) return;
    if (editingCustomer) {
      reset({ firstName: editingCustomer.firstName, lastName: editingCustomer.lastName, phone: editingCustomer.phone, email: editingCustomer.email || '', address: editingCustomer.address || '', notes: editingCustomer.notes || '' });
    } else {
      reset({ firstName: '', lastName: '', phone: '', email: '', address: '', notes: '' });
    }
  }, [modalOpen, editingCustomer?.id]);

  const openCreate = () => { setEditingCustomer(null); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditingCustomer(c); setModalOpen(true); };

  const columns = [
    { key: 'name', header: 'Cliente', render: (c: Customer) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
          {c.firstName[0]}{c.lastName[0]}
        </div>
        <div>
          <p className="font-medium text-stone-800 dark:text-stone-200">{c.firstName} {c.lastName}</p>
          <p className="text-xs text-stone-500">{c.email || '—'}</p>
        </div>
      </div>
    )},
    { key: 'phone', header: 'Teléfono' },
    { key: 'address', header: 'Dirección', render: (c: Customer) => <span className="truncate max-w-[200px] block">{c.address || '—'}</span> },
    { key: 'createdAt', header: 'Registro', render: (c: Customer) => formatDate(c.createdAt) },
    { key: 'actions', header: '', render: (c: Customer) => (
      <div className="flex items-center gap-2 justify-end">
        <button onClick={() => openEdit(c)} className="btn-ghost p-1.5 text-stone-500 hover:text-primary-600"><Edit className="w-4 h-4" /></button>
        <button onClick={() => setDeletingCustomer(c)} className="btn-ghost p-1.5 text-stone-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" subtitle={`${data?.meta?.total ?? 0} clientes registrados`}
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" /> Nuevo cliente</button>} />

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-9 max-w-sm" placeholder="Buscar por nombre, email o teléfono..." />
        </div>
      </div>

      <Table columns={columns} data={data?.data ?? []} loading={isLoading} meta={data?.meta} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} emptyMessage="No hay clientes" />

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingCustomer(null); }} title={editingCustomer ? 'Editar cliente' : 'Nuevo cliente'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre *</label>
              <input {...register('firstName')} className="input" placeholder="María" />
              {errors.firstName && <p className="mt-1 text-xs text-rose-500">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Apellido *</label>
              <input {...register('lastName')} className="input" placeholder="González" />
              {errors.lastName && <p className="mt-1 text-xs text-rose-500">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Teléfono *</label>
            <input {...register('phone')} className="input" placeholder="+591 70000000" />
            {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input" placeholder="cliente@email.com" />
            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Dirección</label>
            <input {...register('address')} className="input" placeholder="Av. Blanco Galindo 1234" />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea {...register('notes')} className="input resize-none" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); setEditingCustomer(null); }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : editingCustomer ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
        title="¿Eliminar cliente?"
        description={`Se eliminará a "${deletingCustomer?.firstName} ${deletingCustomer?.lastName}" y todos sus datos asociados. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
