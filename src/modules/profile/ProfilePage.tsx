import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import {
  User, Lock, ShieldCheck, Phone, Mail, Calendar,
  Pencil, X, Check, Eye, EyeOff, KeyRound,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import ImageUpload from '@/components/ui/ImageUpload';
import { formatDate, ROLE_LABELS, getInitials, getApiError } from '@/lib/utils';
import toast from '@/lib/toast';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName:  z.string().min(1, 'El apellido es requerido'),
  phone:     z.string().optional(),
  avatarUrl: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
    newPassword:     z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm text-stone-800 dark:text-stone-200">{value || '—'}</p>
    </div>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className="input pr-10" />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName  ?? '',
      phone:     user?.phone     ?? '',
      avatarUrl: user?.avatarUrl ?? '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) =>
      authService.updateProfile({ ...data, avatarUrl: data.avatarUrl || undefined }),
    onSuccess: (updated) => {
      updateUser(updated);
      setEditingProfile(false);
      toast.success('Perfil actualizado');
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) => authService.changePassword(data),
    onSuccess: () => {
      passwordForm.reset();
      setEditingPassword(false);
      toast.success('Contraseña actualizada');
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const startEditProfile = () => {
    profileForm.reset({
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName  ?? '',
      phone:     user?.phone     ?? '',
      avatarUrl: user?.avatarUrl ?? '',
    });
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    profileForm.reset();
    setEditingProfile(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ── Hero ── */}
      <div className="card p-6 flex items-center gap-5">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.firstName}
            className="w-16 h-16 rounded-full object-cover ring-4 ring-primary-100 dark:ring-primary-900/40 flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl font-bold ring-4 ring-primary-100 dark:ring-primary-900/40 flex-shrink-0">
            {getInitials(user.firstName, user.lastName)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-stone-900 dark:text-white truncate">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 truncate">{user.email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
              <ShieldCheck className="w-3 h-3" />
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
            {user.createdAt && (
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <Calendar className="w-3.5 h-3.5" />
                Miembro desde {formatDate(user.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Información personal ── */}
      <div className="card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary-600" />
            </div>
            <h2 className="font-semibold text-stone-800 dark:text-stone-200">Información personal</h2>
          </div>
          {!editingProfile && (
            <button onClick={startEditProfile} className="btn-secondary text-xs gap-1.5 py-1.5 px-3">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {!editingProfile ? (
            /* ── Vista ── */
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-stone-200 dark:border-stone-700" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 text-lg font-bold">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-0.5">Foto de perfil</p>
                  <p className="text-sm text-stone-500">{user.avatarUrl ? 'Foto personalizada' : 'Sin foto'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Nombre"    value={user.firstName} />
                <Field label="Apellido"  value={user.lastName} />
                <Field label="Email"     value={user.email} />
                <Field label="Teléfono"  value={user.phone} />
              </div>
            </div>
          ) : (
            /* ── Formulario ── */
            <form onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))} className="space-y-5">
              <div>
                <label className="label">Foto de perfil</label>
                <Controller
                  name="avatarUrl"
                  control={profileForm.control}
                  render={({ field }) => (
                    <ImageUpload
                      value={field.value}
                      onChange={(url) => field.onChange(url ?? '')}
                      aspectRatio="square"
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre *</label>
                  <input {...profileForm.register('firstName')} className="input" />
                  {profileForm.formState.errors.firstName && (
                    <p className="mt-1 text-xs text-rose-500">{profileForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="label">Apellido *</label>
                  <input {...profileForm.register('lastName')} className="input" />
                  {profileForm.formState.errors.lastName && (
                    <p className="mt-1 text-xs text-rose-500">{profileForm.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    value={user.email}
                    readOnly
                    className="input pl-9 bg-stone-50 dark:bg-stone-800/50 text-stone-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="label">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input {...profileForm.register('phone')} className="input pl-9" placeholder="+591 70000000" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={cancelEditProfile} className="btn-secondary gap-1.5">
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button type="submit" className="btn-primary gap-1.5" disabled={profileMutation.isPending}>
                  {profileMutation.isPending
                    ? 'Guardando...'
                    : <><Check className="w-4 h-4" /> Guardar cambios</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Contraseña ── */}
      <div className="card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <h2 className="font-semibold text-stone-800 dark:text-stone-200">Contraseña</h2>
          </div>
          {!editingPassword && (
            <button
              onClick={() => setEditingPassword(true)}
              className="btn-secondary text-xs gap-1.5 py-1.5 px-3"
            >
              <KeyRound className="w-3.5 h-3.5" /> Cambiar
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {!editingPassword ? (
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-600" />
                ))}
              </div>
              <p className="text-sm text-stone-400">Última actualización desconocida</p>
            </div>
          ) : (
            <form
              onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))}
              className="space-y-4"
            >
              <div>
                <label className="label">Contraseña actual *</label>
                <PasswordInput
                  {...passwordForm.register('currentPassword')}
                  placeholder="Tu contraseña actual"
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="mt-1 text-xs text-rose-500">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nueva contraseña *</label>
                  <PasswordInput
                    {...passwordForm.register('newPassword')}
                    placeholder="Mínimo 6 caracteres"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="mt-1 text-xs text-rose-500">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                <div>
                  <label className="label">Confirmar contraseña *</label>
                  <PasswordInput
                    {...passwordForm.register('confirmPassword')}
                    placeholder="Repite la nueva contraseña"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-xs text-rose-500">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setEditingPassword(false); passwordForm.reset(); }}
                  className="btn-secondary gap-1.5"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button type="submit" className="btn-primary gap-1.5" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending
                    ? 'Actualizando...'
                    : <><Check className="w-4 h-4" /> Actualizar contraseña</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}
