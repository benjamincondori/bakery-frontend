# Bakery Pro — Frontend

Aplicación web SPA construida con **React 18**, **TypeScript** y **Vite**. Interfaz de usuario completa para el sistema de gestión de pastelería: POS, pedidos, producción, inventario, delivery, facturación y reportes analíticos.

## Tabla de Contenidos

- [Stack y dependencias](#stack-y-dependencias)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Variables de entorno](#variables-de-entorno)
- [Módulos y páginas](#módulos-y-páginas)
- [Arquitectura y patrones](#arquitectura-y-patrones)
- [Componentes UI reutilizables](#componentes-ui-reutilizables)
- [Gestión de estado](#gestión-de-estado)
- [Capa de servicios](#capa-de-servicios)
- [Scripts disponibles](#scripts-disponibles)

---

## Stack y Dependencias

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| **React** | 18.2 | Framework de UI |
| **TypeScript** | 5.4 | Tipado estático |
| **Vite** | 5.2 | Build tool y dev server |
| **TailwindCSS** | 3.4 | Estilos utilitarios |
| **React Router DOM** | 6.22 | Enrutamiento SPA |
| **TanStack Query** | 5.28 | Server state, caché, sincronización |
| **Zustand** | 4.5 | Estado global del cliente |
| **Axios** | 1.6 | Cliente HTTP con interceptores |
| **React Hook Form** | 7.51 | Formularios performantes |
| **Zod** | 3.22 | Validación de esquemas |
| **Lucide React** | 0.363 | Iconos SVG |
| **Recharts** | 2.12 | Gráficos y visualizaciones |
| **react-hot-toast** | 2.4 | Notificaciones |
| **date-fns** | 3.6 | Utilidades de fechas |
| **clsx + tailwind-merge** | — | Clases CSS condicionales |

---

## Estructura del Proyecto

```
frontend/
├── public/                        # Archivos estáticos
├── src/
│   ├── main.tsx                   # Punto de entrada React
│   ├── App.tsx                    # Router principal con rutas protegidas
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx     # Estructura: Sidebar + Header + Outlet
│   │   │   ├── Sidebar.tsx        # Navegación lateral con íconos
│   │   │   └── Header.tsx         # Barra superior: usuario, dark mode, logout
│   │   └── ui/                    # Componentes reutilizables
│   │       ├── Badge.tsx          # Etiquetas de estado con variantes de color
│   │       ├── ConfirmModal.tsx   # Modal de confirmación de acciones
│   │       ├── ImageUpload.tsx    # Uploader con preview y conversión WebP
│   │       ├── Modal.tsx          # Modal base con overlay y tamaños
│   │       ├── PageHeader.tsx     # Encabezado de página: título + acciones
│   │       ├── StatsCard.tsx      # Tarjeta de estadística con ícono y tendencia
│   │       └── Table.tsx          # Tabla genérica con paginación integrada
│   │
│   ├── modules/                   # Una carpeta por página del sistema
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── products/
│   │   │   └── ProductsPage.tsx
│   │   ├── customers/
│   │   │   └── CustomersPage.tsx
│   │   ├── inventory/
│   │   │   └── InventoryPage.tsx
│   │   ├── recipes/
│   │   │   └── RecipesPage.tsx
│   │   ├── production/
│   │   │   └── ProductionPage.tsx
│   │   ├── orders/
│   │   │   └── OrdersPage.tsx
│   │   ├── sales/
│   │   │   └── SalesPage.tsx
│   │   ├── payments/
│   │   │   └── PaymentsPage.tsx
│   │   ├── invoices/
│   │   │   └── InvoicesPage.tsx
│   │   ├── delivery/
│   │   │   └── DeliveryPage.tsx
│   │   ├── reports/
│   │   │   └── ReportsPage.tsx
│   │   ├── users/
│   │   │   └── UsersPage.tsx
│   │   └── profile/
│   │       └── ProfilePage.tsx
│   │
│   ├── services/
│   │   ├── index.ts               # makeService + servicios especializados
│   │   └── products.service.ts    # Servicio de productos y categorías
│   │
│   ├── store/
│   │   ├── auth.store.ts          # Zustand: tokens, usuario, login/logout
│   │   └── ui.store.ts            # Zustand: darkMode, sidebar
│   │
│   ├── types/
│   │   └── index.ts               # Interfaces TypeScript globales
│   │
│   └── lib/
│       ├── axios.ts               # Instancia Axios + interceptores JWT
│       ├── toast.ts               # Wrapper de react-hot-toast
│       ├── utils.ts               # formatCurrency, formatDate, cn, labels...
│       └── invoicePdf.ts          # Generador de PDF para facturas
│
├── .env.example                   # Plantilla de variables de entorno
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Requisitos Previos

- **Node.js** >= 20.x
- **npm** >= 10.x
- El **backend** corriendo en `http://localhost:3000` (o la URL configurada en `.env`)

---

## Instalación y Ejecución

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Verificar que `VITE_API_URL` apunte al backend correcto.

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: `http://localhost:5173`

### Build de producción

```bash
# Compilar y construir
npm run build

# Preview del build
npm run preview
```

Los archivos compilados quedan en `dist/` listos para ser servidos por cualquier servidor estático (Nginx, Vercel, Netlify, etc.).

---

## Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `VITE_API_URL` | URL base del backend API | `http://localhost:3000/api/v1` |
| `VITE_APP_NAME` | Nombre de la aplicación | `Bakery Management` |

> Las variables de Vite deben tener el prefijo `VITE_` para ser accesibles en el código del cliente via `import.meta.env.VITE_*`.

---

## Módulos y Páginas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/login` | LoginPage | Autenticación — ruta pública |
| `/dashboard` | DashboardPage | Estadísticas, gráficos, resumen del día |
| `/products` | ProductsPage | CRUD de productos y categorías (tabs) |
| `/customers` | CustomersPage | CRUD de clientes con búsqueda |
| `/inventory` | InventoryPage | Ingredientes, movimientos, filtro de stock bajo |
| `/recipes` | RecipesPage | Recetas, ingredientes, cálculo de costo |
| `/production` | ProductionPage | Órdenes de producción con stepper visual |
| `/orders` | OrdersPage | Pedidos personalizados con seguimiento |
| `/sales` | SalesPage | POS completo + historial de ventas |
| `/payments` | PaymentsPage | Cobro de pedidos + historial |
| `/invoices` | InvoicesPage | Facturas, anulación, PDF, impresión |
| `/delivery` | DeliveryPage | Entregas, asignación, pago contra entrega |
| `/reports` | ReportsPage | Dashboard analítico con gráficos |
| `/users` | UsersPage | CRUD de usuarios con roles |
| `/profile` | ProfilePage | Perfil personal del usuario autenticado |

### Control de acceso por rutas

```tsx
// Rutas protegidas: redirigen a /login si no hay sesión
<ProtectedRoute>
  <MainLayout />
</ProtectedRoute>

// Rutas públicas: redirigen a / si ya hay sesión
<PublicRoute>
  <LoginPage />
</PublicRoute>
```

---

## Arquitectura y Patrones

### Flujo de datos

```
Componente
  └── useQuery / useMutation  (TanStack Query)
        └── service.método()
              └── api.get/post/patch/delete()  (Axios)
                    └── interceptor agrega Bearer token
                          └── Backend API
```

### Patrón de respuesta de la API

Todos los endpoints paginados devuelven un objeto `ApiResponse<T>`:

```typescript
{
  success: true,
  data: T[],           // array de items
  meta: {
    total: number,     // total de registros
    page: number,
    limit: number,
    totalPages: number
  }
}
```

Por eso en todas las páginas el patrón es:

```tsx
const { data } = useQuery({ queryFn: () => someService.getAll(params) });

// Para la tabla:
data={data?.data ?? []}

// Para el total en el header:
subtitle={`${data?.meta?.total ?? 0} registros`}
```

### Refresh automático de tokens

El interceptor de Axios (`lib/axios.ts`) maneja automáticamente los errores `401`:

1. Detecta el error 401
2. Pausa las requests pendientes en una cola
3. Llama a `/auth/refresh` con el refresh token
4. Actualiza los tokens en el store de Zustand
5. Reintenta todas las requests pausadas con el nuevo token
6. Si el refresh falla, redirige a `/login`

---

## Componentes UI Reutilizables

### `<Table />`

Tabla genérica con paginación, control de filas por página y estado de carga.

```tsx
<Table
  columns={columns}        // ColumnDef[]
  data={data?.data ?? []}  // T[]
  loading={isLoading}
  meta={data?.meta}        // Para paginación automática
  onPageChange={setPage}
  onLimitChange={setLimit}
  emptyMessage="Sin registros"
/>
```

### `<Modal />`

```tsx
<Modal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  title="Título del modal"
  size="sm | md | lg | xl | 2xl"  // default: md
>
  {/* contenido */}
</Modal>
```

### `<ConfirmModal />`

```tsx
<ConfirmModal
  isOpen={!!deletingItem}
  onClose={() => setDeletingItem(null)}
  onConfirm={() => deleteMutation.mutate(deletingItem.id)}
  title="¿Eliminar?"
  description="Esta acción no se puede deshacer."
  confirmLabel="Sí, eliminar"
  variant="danger | warning"
  loading={deleteMutation.isPending}
/>
```

### `<Badge />`

```tsx
<Badge variant="success | danger | warning | info | purple | default">
  Texto
</Badge>
```

### `<PageHeader />`

```tsx
<PageHeader
  title="Clientes"
  subtitle="150 registros"
  actions={<button className="btn-primary">Nuevo</button>}
/>
```

### `<ImageUpload />`

```tsx
<ImageUpload
  value={imageUrl}
  onChange={(url) => setImageUrl(url)}
  aspectRatio="square | wide"
/>
```

---

## Gestión de Estado

### `auth.store.ts` — Zustand con persistencia en localStorage

```typescript
{
  user: User | null,
  accessToken: string | null,
  refreshToken: string | null,
  isAuthenticated: boolean,

  // Acciones
  login(user, accessToken, refreshToken): void,
  logout(): void,
  setTokens(accessToken, refreshToken): void,
  updateUser(user): void,
}
```

### `ui.store.ts` — Preferencias de UI

```typescript
{
  darkMode: boolean,
  sidebarCollapsed: boolean,

  toggleDarkMode(): void,
  toggleSidebar(): void,
}
```

---

## Capa de Servicios

### `makeService(base)` — Fábrica de CRUD

```typescript
// services/index.ts
const makeService = (base: string) => ({
  getAll: (params?) => api.get(base, { params }).then(r => r.data),
  // Devuelve ApiResponse<T[]> completo — acceder con .data y .meta

  getOne: (id) => api.get(`${base}/${id}`).then(r => r.data.data),
  create: (data) => api.post(base, data).then(r => r.data.data),
  update: (id, data) => api.patch(`${base}/${id}`, data).then(r => r.data.data),
  remove: (id) => api.delete(`${base}/${id}`).then(r => r.data.data),
});

export const customersService = makeService('/customers');
export const usersService = makeService('/users');
// ...etc
```

### Servicios especializados

```typescript
// Métodos adicionales con endpoints propios
export const ordersService = {
  ...makeService('/orders'),
  updateStatus: (id, status) => ...,
  cancel: (id) => ...,
};

export const salesService = {
  ...makeService('/sales'),
  getDailySummary: () => ...,
  openCashRegister: (data) => ...,
  closeCashRegister: (id, amount) => ...,
};

// productos.service.ts — separado porque incluye categorías
export const productsService = {
  getAll: (params?) => ...,        // → ApiResponse<Product[]>
  getCategories: () => ...,        // → Category[] (array directo)
  createCategory: (data) => ...,
  // ...
};
```

---

## Scripts Disponibles

```bash
npm run dev           # Servidor de desarrollo en http://localhost:5173
npm run build         # Compilar TypeScript + build de producción (genera dist/)
npm run preview       # Previsualizar el build de producción localmente
npm run lint          # Verificar código con ESLint
npm run type-check    # Verificación de tipos sin emitir archivos
```
