import React, { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { apiFetch, apiPost } from "../lib/api";
import type { Order } from "../lib/types";

interface StaffOrder extends Order {
  items: Order["items"];
  table_label?: string;
}

export const StaffKitchenPage: React.FC = () => {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const loadOrders = async () => {
    const data = await apiFetch<{ orders: StaffOrder[] }>(
      "/api/staff/orders?status=ACCEPTED,PREPARING"
    );
    const newIds = new Set(data.orders.map((order) => order.id));
    const prevIds = prevIdsRef.current;
    if (prevIds.size && data.orders.some((order) => !prevIds.has(order.id))) {
      setNotification("New order update");
      setTimeout(() => setNotification(null), 3000);
    }
    prevIdsRef.current = newIds;
    setOrders(data.orders);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, 4000);
    return () => clearInterval(timer);
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await apiPost(`/api/staff/orders/${id}/status`, { status });
    loadOrders();
  };

  if (loading) {
    return <div className="py-12 text-center text-[var(--text-muted)]">Loading kitchen queue...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl">Kitchen Queue</h2>
      {notification && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm">
          {notification}
        </div>
      )}
      {orders.length === 0 ? (
        <Card>No active orders.</Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">{order.table_label}</p>
                  <h3 className="font-display text-lg">{order.order_code}</h3>
                </div>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">{order.status}</span>
              </div>
              <div className="space-y-2 text-sm">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.product_name_snapshot_en}</span>
                    <span>x{item.qty}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {order.status === "ACCEPTED" && (
                  <Button onClick={() => updateStatus(order.id, "PREPARING")}>Mark preparing</Button>
                )}
                {order.status === "PREPARING" && (
                  <Button onClick={() => updateStatus(order.id, "READY")}>Mark ready</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
