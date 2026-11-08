export type UserRole = 'admin' | 'staff' | 'delivery';

/** Owner-granted permissions for staff / delivery accounts (enforced in firestore.rules). */
export interface StaffPermissions {
  viewOrders: boolean;      // read orders list
  updateStatus: boolean;    // change order status (status + updatedAt only)
  toggleProducts: boolean;  // switch products on/off (e.g. out of stock)
}

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  viewOrders: true,
  updateStatus: true,
  toggleProducts: false,
};

export interface UserProfile {
  uid: string;
  email?: string;
  name?: string;
  phone?: string;
  customerType?: 'retail' | 'wholesale';
  role: UserRole;
  whatsappEnabled?: boolean;
  permissions?: Partial<StaffPermissions>;
  approvedAt?: any;
  createdAt: any;
}

/** A person asking the owner for staff access (users/{uid}.role is written only by the owner). */
export interface StaffRequest {
  uid: string;
  email: string;
  name?: string;
  status: 'pending';
  requestedAt: any;
}

export type ThemeId = 'saffron' | 'emerald' | 'royal-blue' | 'purple' | 'ice-blue' | 'dark';

export interface LuckyWinner {
  active: boolean;
  name: string;
  city: string;
  dateLabel?: string; // e.g. "आज" / "29 अक्टूबर"
  updatedAt?: any;
}

export type PromoAction = 'order' | 'categories' | 'call' | 'whatsapp' | 'none';

export interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  action: PromoAction;
}

export interface HomeSettings {
  banners: PromoBanner[];
  updatedAt?: any;
}

export type OrderStatus = 'pending' | 'confirmed' | 'in_packing' | 'dispatched' | 'delivered' | 'cancelled';


export type PaymentStatus = 'pending_verification' | 'payment_verified' | 'cash_on_delivery';

export interface RateSettings {
  dryIceRate: number;      // default: 50
  thermocolRate: number;   // default: 10
  transportRate: number;   // default: 0
  wholesaleRate?: number;  // unset until the owner enters an approved rate
  updatedAt?: any;
}

export interface Order {
  billingVersion?: 2;
  productId?: string;
  billing?: import('./billing/unitBilling').BillSnapshot;
  orderId: string;
  trackingToken: string; // Combined secret token: ${orderId}_${trackingPin}
  trackingPin: string;
  customerName: string;
  customerPhone: string;
  district: string; // Uttar Pradesh district
  address?: string; // Optional village/city/landmark address
  city?: string;    // City name
  quantityKg: number;
  dispatchTiming: string; // e.g., 'आज सुबह 12 AM–12 PM'
  dispatchDate?: string; // YYYY-MM-DD in Asia/Kolkata
  slot?: 'morning' | 'evening';
  customerType?: 'retail' | 'wholesale';
  calculatedTotal?: number;
  customerTotal?: number;
  amountChanged?: boolean;
  amountChangeReason?: string;
  testOrder?: boolean;
  thermocolIncluded?: boolean;
  productName: string; // 'ड्राई आइस'
  
  // Booked pricing formula:
  dryIcePricePerKg: number;      // e.g. 50
  dryIceSubtotal: number;        // quantityKg * dryIcePricePerKg
  thermocolPricePerKg: number;   // e.g. 10
  thermocolSubtotal: number;     // quantityKg * thermocolPricePerKg
  transportPrice?: number;       // default 0
  totalAmount: number;           // total booked amount

  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  paymentNotes?: string;
  selfPickup?: import('./utils/selfPickup').PickupState;
  verifiedReceivedAmount?: number;
  pickupBoxes?: number;
  userId: string;
  
  // Trash / deletion management (non-permanent soft delete)
  isTrash?: boolean;
  trashedAt?: any;

  createdAt: any;
  updatedAt: any;
}

export interface OrderTracking {
  billingVersion?: 2;
  productId?: string;
  billing?: Pick<import('./billing/unitBilling').BillSnapshot,'unit'|'quantityUnits'>;
  orderId: string;
  trackingToken: string;
  status: OrderStatus;
  productName: string;
  quantityKg: number;
  district: string;
  dispatchTiming: string;
  dispatchDate?: string;
  slot?: 'morning' | 'evening';
  paymentStatus: PaymentStatus;
  lastStatusUpdate: string;
  createdAt: any;
  updatedAt: any;
}

// Owner-only product management structure
export interface ProductItem {
  unitProduct?: import('./billing/unitBilling').UnitProduct;
  id: string;
  name: string;
  hindiName: string;
  ratePerKg: number;
  thermocolPerKg: number;
  active: boolean;
  category: string;
  imageUrl?: string;        // https:// only (enforced in rules)
  description?: string;
  unit?: string;            // e.g. "kg"
  badge?: string;           // e.g. "बेस्ट सेलर"
  sortOrder?: number;
  mrpPerKg?: number;
  /** true => price follows the global rates in settings/rates (legacy behaviour) */
  useGlobalRates?: boolean;
  updatedAt?: any;
}
