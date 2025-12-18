import React, { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { apiFetch, apiPost } from "../lib/api";
import type { Order } from "../lib/types";

interface StaffOrder extends Order {
  items: Order["items"];
  table_label?: string;
}

export const StaffFrontDeskPage: React.FC = () => {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [etaMap, setEtaMap] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<string | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const loadOrders = async () => {
    const data = await apiFetch<{ orders: StaffOrder[] }>(
      "/api/staff/orders?status=PLACED,ACCEPTED,READY"
    );
    const newIds = new Set(data.orders.map((order) => order.id));
    const prevIds = prevIdsRef.current;
    if (prevIds.size && data.orders.some((order) => !prevIds.has(order.id))) {
      setNotification("New order received");
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

  const acceptOrder = async (id: string) => {
    const eta = etaMap[id] ?? 10;
    await apiPost(`/api/staff/orders/${id}/accept`, { etaMinutes: eta });
    loadOrders();
  };

  const updateStatus = async (id: string, status: string) => {
    await apiPost(`/api/staff/orders/${id}/status`, { status });
    loadOrders();
  };

  if (loading) {
    return <div className="py-12 text-center text-[var(--text-muted)]">Loading front desk...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl">Front Desk</h2>
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
              <div className="flex flex-wrap items-center gap-2">
                {order.status === "PLACED" && (
                  <>
                    <Input
                      label="ETA (minutes)"
                      type="number"
                      value={etaMap[order.id] ?? 10}
                      onChange={(event) =>
                        setEtaMap((prev) => ({ ...prev, [order.id]: Number(event.target.value) }))
                      }
                    />
                    <Button onClick={() => acceptOrder(order.id)}>Accept</Button>
                  </>
                )}
                {order.status === "READY" && (
                  <Button onClick={() => updateStatus(order.id, "SERVED")}>Mark served</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
