export type UserRole = 'ADMIN' | 'CASHIER' | 'BAKER' | 'DELIVERY' | 'SUPERVISOR';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'ON_ROUTE' | 'PAID' | 'DELIVERED' | 'CANCELLED';
export type OrderType = 'DELIVERY' | 'PICKUP';
export type PaymentMode = 'PRE_PAYMENT' | 'ON_DELIVERY';
export type ProductionStatus = 'PENDING' | 'PREPARING' | 'DECORATING' | 'FINISHED';
export type PaymentMethod = 'CASH' | 'QR' | 'CARD' | 'TRANSFER';
export type MovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
export type InvoiceStatus = 'ACTIVE' | 'CANCELLED' | 'PAID';
export type SaleStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser extends User {}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  stock: number;
  imageUrl?: string;
  isActive: boolean;
  categoryId: string;
  category?: Category;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: string;
  stock: number;
  minStock: number;
  cost: number;
  expiryDate?: string;
  isActive: boolean;
  isLowStock?: boolean;
}

export interface InventoryMovement {
  id: string;
  ingredientId: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string;
  createdAt: string;
  ingredient?: Ingredient;
  user?: { firstName: string; lastName: string };
}

export interface RecipeDetail {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  ingredient?: Ingredient;
}

export interface Recipe {
  id: string;
  productId: string;
  description?: string;
  yield: number;
  preparationTime?: number;
  instructions?: string;
  product?: Product;
  recipeDetails?: RecipeDetail[];
}

export interface OrderDetail {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  product?: Product;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  orderType: OrderType;
  paymentMode?: PaymentMode;
  deliveryDate: string;
  totalAmount: number;
  notes?: string;
  imageUrl?: string;
  isCustom: boolean;
  deliveryAddress?: string;
  createdAt: string;
  customer?: Customer;
  createdBy?: { firstName: string; lastName: string };
  orderDetails?: OrderDetail[];
  productionOrders?: ProductionOrder[];
  delivery?: Delivery;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  recipeId: string;
  orderId?: string;
  assignedTo?: string;
  quantity: number;
  status: ProductionStatus;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  recipe?: Recipe & { product?: Product };
  assignee?: { firstName: string; lastName: string };
}

export interface SaleDetail {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  product?: Product;
}

export interface Payment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  customerId?: string;
  orderId?: string;
  status: SaleStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: string;
  customer?: Customer;
  saleDetails?: SaleDetail[];
  payments?: Payment[];
  user?: { firstName: string; lastName: string };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  saleId: string;
  customerId?: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  cancelReason?: string;
  issuedAt: string;
  cancelledAt?: string;
  customer?: Customer;
  sale?: Sale;
}

export interface Delivery {
  id: string;
  orderId: string;
  driverId?: string;
  status: DeliveryStatus;
  address: string;
  notes?: string;
  deliveryCost: number;
  assignedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  order?: Order;
  driver?: { firstName: string; lastName: string; phone?: string };
}

export interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  monthRevenue: number;
  pendingOrders: number;
  activeProductionOrders: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockIngredients: number;
  pendingDeliveries: number;
}
