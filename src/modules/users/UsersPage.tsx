import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usersService } from '@/services/index';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Badge from '@/components/ui/Badge';
import ImageUpload from '@/components/ui/ImageUpload';
import { formatDate, ROLE_LABELS, getInitials, getApiError } from '@/lib/utils';
import type { User, UserRole } from '@/types';
import toast from '@/lib/toast';
import api from '@/lib/axios';

const ROLES: UserRole[] = ['ADMIN', 'SUPERVISOR', 'CASHIER', 'BAKER', 'DELIVERY'];
const ROLE_COLORS: Record<UserRole, any> = {
  ADMIN: 'danger', SUPERVISOR: 'purple', CASHIER: 'info', BAKER: 'warning', DELIVERY: 'success',
};

const schema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().min(1, 'El email es requerido').email('El email no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().min(1, 'Selecciona un rol'),
  avatarUrl: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, limit, search],
    queryFn: () => usersService.getAll({ page, limit, search }),
  });

  const { register, handleSubmit, reset, control, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const saveMutation = useMutation({
    mutationFn: (dto: FormData) => {
      if (editingUser) {
        const { password, ...updatePayload } = dto;
        return api.patch(`/users/${editingUser.id}`, {
          ...updatePayload,
          phone: updatePayload.phone || undefined,
          avatarUrl: updatePayload.avatarUrl || undefined,
        }).then(r => r.data.data);
      }
      return api.post('/users', {
        ...dto,
        phone: dto.phone || undefined,
        avatarUrl: dto.avatarUrl || undefined,
      }).then(r => r.data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(editingUser ? 'Usuario actualizado' : 'Usuario creado');
      setModalOpen(false); reset(); setEditingUser(null);
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/toggle-active`).then(r => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Estado actualizado'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario eliminado');
      setDeletingUser(null);
    },
    onError: () => toast.error('Error al eliminar'),
  });

  useEffect(() => {
    if (!modalOpen) return;
    if (editingUser) {
      reset({ firstName: editingUser.firstName, lastName: editingUser.lastName, email: editingUser.email, phone: editingUser.phone || '', role: editingUser.role, password: '', avatarUrl: editingUser.avatarUrl || '' });
    } else {
      reset({ firstName: '', lastName: '', email: '', phone: '', role: '', password: '', avatarUrl: '' });
    }
  }, [modalOpen, editingUser?.id]);

  const openCreate = () => { setEditingUser(null); setModalOpen(true); };
  const openEdit = (u: User) => { setEditingUser(u); setModalOpen(true); };

  const onSubmit = (d: FormData) => {
    if (!editingUser && !d.password?.trim()) {
      setError('password', { message: 'La contraseña es requerida' });
      return;
    }
    saveMutation.mutate(d);
  };

  const columns = [
    { key: 'name', header: 'Usuario', render: (u: User) => (
      <div className="flex items-center gap-3">
        {u.avatarUrl ? (
          <img src={u.avatarUrl} alt={u.firstName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {getInitials(u.firstName, u.lastName)}
          </div>
        )}
        <div>
          <p className="font-medium">{u.firstName} {u.lastName}</p>
          <p className="text-xs text-stone-500">{u.email}</p>
        </div>
      </div>
    )},
    { key: 'role', header: 'Rol', render: (u: User) => (
      <Badge variant={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
    )},
    { key: 'isActive', header: 'Estado', render: (u: User) => (
      <Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Activo' : 'Inactivo'}</Badge>
    )},
    { key: 'createdAt', header: 'Creado', render: (u: User) => formatDate(u.createdAt) },
    { key: 'actions', header: '', render: (u: User) => (
      <div className="flex items-center gap-2 justify-end">
        <button onClick={() => toggleMutation.mutate(u.id)} className="btn-ghost p-1.5 text-stone-500" title={u.isActive ? 'Desactivar' : 'Activar'}>
          {u.isActive ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
        </button>
        <button onClick={() => openEdit(u)} className="btn-ghost p-1.5 text-stone-500 hover:text-primary-600"><Edit className="w-4 h-4" /></button>
        <button onClick={() => setDeletingUser(u)} className="btn-ghost p-1.5 text-stone-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" subtitle={`${data?.meta?.total ?? 0} usuarios`}
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" /> Nuevo usuario</button>} />

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-9" placeholder="Buscar usuarios..." />
        </div>
      </div>

      <Table columns={columns} data={data?.data ?? []} loading={isLoading} meta={data?.meta} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} emptyMessage="No hay usuarios" />

      <ConfirmModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
        title="¿Eliminar usuario?"
        description={`Se eliminará la cuenta de "${deletingUser?.firstName} ${deletingUser?.lastName}". Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        loading={deleteMutation.isPending}
      />

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingUser(null); }} title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre *</label>
              <input {...register('firstName')} className="input" placeholder="Juan" />
              {errors.firstName && <p className="mt-1 text-xs text-rose-500">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Apellido *</label>
              <input {...register('lastName')} className="input" placeholder="Pérez" />
              {errors.lastName && <p className="mt-1 text-xs text-rose-500">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input {...register('email')} type="email" className="input" placeholder="usuario@bakery.com" />
            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
          </div>
          {!editingUser && (
            <div>
              <label className="label">Contraseña *</label>
              <input {...register('password')} type="password" className="input" placeholder="Mínimo 6 caracteres" />
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
            </div>
          )}
          <div>
            <label className="label">Teléfono</label>
            <input {...register('phone')} className="input" placeholder="+591 70000000" />
          </div>
          <div>
            <label className="label">Rol *</label>
            <select {...register('role')} className="input">
              <option value="">Seleccionar rol</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            {errors.role && <p className="mt-1 text-xs text-rose-500">{errors.role.message}</p>}
          </div>
          <div>
            <label className="label">Foto de perfil</label>
            <Controller
              name="avatarUrl"
              control={control}
              render={({ field }) => (
                <ImageUpload
                  value={field.value}
                  onChange={(url) => field.onChange(url ?? '')}
                  aspectRatio="square"
                />
              )}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); setEditingUser(null); }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
