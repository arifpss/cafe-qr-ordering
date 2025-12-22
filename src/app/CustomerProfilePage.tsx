import React, { useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import type { Order } from "../lib/types";

export const CustomerProfilePage: React.FC = () => {
  const { t } = useI18n();
  const { user, refresh, updateProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState({ name: "", email: "", phone: "", password: "" });

  useEffect(() => {
    setFormState({
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      password: ""
    });
  }, [user]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        await refresh();
        if (user?.role === "customer" && user && !user.phone.startsWith("GUEST-")) {
          const data = await apiFetch<{ orders: Order[] }>("/api/orders/history");
          if (!active) return;
          setOrders(data.orders);
        }
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
  }, [refresh, user]);

  if (!user || loading) {
    return <div className="py-12 text-center text-[var(--text-muted)]">Loading...</div>;
  }
  if (user.phone.startsWith("GUEST-")) {
    return (
      <div className="py-12 text-center text-[var(--text-muted)]">
        Guest accounts can only place orders and view order status. Please login to manage a profile.
      </div>
    );
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      await updateProfile({
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        password: formState.password || undefined
      });
      setSaveMessage(t("profileUpdated"));
      setFormState((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">{user.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">{user.username ?? user.phone}</p>
          </div>
          <Badge label={user.role === "customer" ? user.badge.displayName : user.role.toUpperCase()} />
        </div>
        {user.role === "customer" && (
          <div className="flex flex-wrap gap-3 text-sm">
            <span>
              {t("points")}: {user.points}
            </span>
            <span>
              {t("discount")}: {user.discountPercent}%
            </span>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h3 className="font-display text-lg">{t("editProfile")}</h3>
        <form className="space-y-2" onSubmit={handleSave}>
          <Input label={t("name")} value={formState.name} onChange={(event) => setFormState({ ...formState, name: event.target.value })} />
          <Input label={t("email")} value={formState.email} onChange={(event) => setFormState({ ...formState, email: event.target.value })} />
          <Input label={t("phone")} value={formState.phone} onChange={(event) => setFormState({ ...formState, phone: event.target.value })} />
          <Input
            label={t("newPasswordOptional")}
            type="password"
            value={formState.password}
            onChange={(event) => setFormState({ ...formState, password: event.target.value })}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          {saveMessage && <p className="text-xs text-emerald-400">{saveMessage}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </form>
      </Card>

      {user.role === "customer" ? (
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
      ) : (
        <Card className="text-sm text-[var(--text-muted)]">
          Order history is available in the All Orders tab.
        </Card>
      )}
    </div>
  );
};
