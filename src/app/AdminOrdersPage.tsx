import React, { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { apiFetch } from "../lib/api";
import type { Order } from "../lib/types";

interface AdminOrder extends Order {
  table_label?: string;
  customer_name?: string;
  customer_phone?: string;
}

const statusOptions = [
  "ALL",
  "RECEIVED",
  "PREPARING",
  "SERVING",
  "SERVED",
  "PAYMENT_RECEIVED",
  "CANCELLED"
];

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = status === "ALL" ? "" : `?status=${status}`;
      const data = await apiFetch<{ items: AdminOrder[] }>(`/api/admin/orders${query}`);
      setOrders(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">All Orders</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-[var(--text-muted)]">
            Status
            <select
              className="ml-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option.split("_").join(" ")}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" onClick={loadOrders}>
            Refresh
          </Button>
        </div>
      </div>

      {loading && <Card>Loading orders...</Card>}
      {error && <Card className="text-red-400">{error}</Card>}
      {!loading && !error && orders.length === 0 && <Card>No orders found.</Card>}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg">{order.order_code}</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Table {order.table_label} · {order.customer_name ?? "Guest"}
                  </p>
                </div>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                  {order.status.split("_").join(" ")}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>Total: Tk {order.total_after_discount_tk}</span>
                <span>{new Date(order.placed_at).toLocaleString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
