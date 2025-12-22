import React, { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import type { Order } from "../lib/types";

export const CustomerProfilePage: React.FC = () => {
  const { t } = useI18n();
  const { user, refresh } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        await refresh();
        const data = await apiFetch<{ orders: Order[] }>("/api/orders/history");
        if (!active) return;
        setOrders(data.orders);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load profile");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [refresh]);

  if (!user || loading) {
    return <div className="py-12 text-center text-[var(--text-muted)]">Loading...</div>;
  }
  if (user.phone.startsWith("GUEST-")) {
    return (
      <div className="py-12 text-center text-[var(--text-muted)]">
        Guest accounts can only place orders and view order status. Please login to see your profile.
      </div>
    );
  }
  if (error) {
    return <div className="py-12 text-center text-[var(--text-muted)]">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-2">
        <h2 className="font-display text-2xl">{user.name}</h2>
        <p className="text-sm text-[var(--text-muted)]">{user.phone}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge label={user.badge.displayName} />
          <span>
            {t("points")}: {user.points}
          </span>
          <span>
            {t("discount")}: {user.discountPercent}%
          </span>
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-display text-lg">{t("orderHistory")}</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No orders yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {orders.map((order) => (
              <div key={order.id} className="flex justify-between border-b border-[var(--border)] pb-2">
                <div>
                  <p className="font-medium">{order.order_code}</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(order.placed_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">Tk {order.total_after_discount_tk}</p>
                  <p className="text-xs text-[var(--text-muted)]">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
