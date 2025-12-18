export interface BadgeLevel {
  key: string;
  minPoints: number;
  discountPercent: number;
}

export interface OrderLineInput {
  unitPrice: number;
  qty: number;
}

export const calculateBadge = (points: number, badges: BadgeLevel[]): BadgeLevel => {
  if (!badges.length) {
    return { key: "NEWBIE", minPoints: 0, discountPercent: 0 };
  }
  const sorted = [...badges].sort((a, b) => a.minPoints - b.minPoints);
  let current = sorted[0];
  for (const badge of sorted) {
    if (points >= badge.minPoints) {
      current = badge;
    }
  }
  return current;
};

export const calculateDiscountAmount = (total: number, discountPercent: number) => {
  if (discountPercent <= 0) return 0;
  return Math.round((total * discountPercent) / 100);
};

export const calculateOrderTotals = (items: OrderLineInput[], discountPercent: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const discountAmount = calculateDiscountAmount(subtotal, discountPercent);
  const totalAfter = Math.max(0, subtotal - discountAmount);
  return {
    subtotal,
    discountAmount,
    totalAfter
  };
};

export const isSessionExpired = (expiresAt: string, now = new Date()) => {
  return new Date(expiresAt).getTime() <= now.getTime();
};

export const createSessionExpiry = (days: number, from = new Date()) => {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
};
