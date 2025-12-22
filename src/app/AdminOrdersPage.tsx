import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { apiFetch, apiPost } from "../lib/api";
import type { Order } from "../lib/types";

interface AdminOrder extends Order {
  items: Order["items"];
  table_label?: string;
  customer_name?: string;
  customer_phone?: string;
}

const statusOptions = [
  { value: "ALL", label: "All" },
  { value: "RECEIVED", label: "Received" },
  { value: "PREPARING", label: "Preparing" },
  { value: "SERVING", label: "Serving" },
  { value: "SERVED", label: "Served" },
  { value: "PAYMENT_RECEIVED", label: "Payment received" },
  { value: "CANCELLED", label: "Cancelled" }
];

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<{ id: string; name_en: string; price_tk: number }[]>([]);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<Record<string, { productId: string; qty: number }[]>>({});
  const [etaMap, setEtaMap] = useState<Record<string, number>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      const data = await apiFetch<{ products: { id: string; name_en: string; price_tk: number }[] }>("/api/products");
      setProducts(data.products);
    };
    loadProducts();
  }, []);

  useEffect(() => {
    setEtaMap((prev) => {
      const next = { ...prev };
      orders.forEach((order) => {
        if (next[order.id] === undefined) {
          next[order.id] = order.eta_minutes ?? 10;
        }
      });
      return next;
    });
  }, [orders]);

  const updateStatus = async (id: string, nextStatus: string) => {
    const etaMinutes =
      nextStatus === "PREPARING" || nextStatus === "SERVING" ? etaMap[id] ?? 10 : undefined;
    await apiPost(`/api/staff/orders/${id}/status`, { status: nextStatus, etaMinutes });
    loadOrders();
  };

  const startEditItems = (order: AdminOrder) => {
    setEditingOrder(order.id);
    setEditingItems((prev) => ({
      ...prev,
      [order.id]: order.items?.map((item) => ({ productId: item.product_id, qty: item.qty })) ?? []
    }));
  };

  const updateEditItemQty = (orderId: string, index: number, qty: number) => {
    setEditingItems((prev) => {
      const list = [...(prev[orderId] ?? [])];
      list[index] = { ...list[index], qty };
      return { ...prev, [orderId]: list };
    });
  };

  const removeEditItem = (orderId: string, index: number) => {
    setEditingItems((prev) => {
      const list = [...(prev[orderId] ?? [])];
      list.splice(index, 1);
      return { ...prev, [orderId]: list };
    });
  };

  const addEditItem = (orderId: string, productId: string) => {
    if (!productId) return;
    setEditingItems((prev) => {
      const list = [...(prev[orderId] ?? [])];
      list.push({ productId, qty: 1 });
      return { ...prev, [orderId]: list };
    });
  };

  const saveEditItems = async (orderId: string) => {
    const items = editingItems[orderId]?.filter((item) => item.qty > 0) ?? [];
    if (!items.length) return;
    setSavingOrderId(orderId);
    await apiPost(`/api/staff/orders/${orderId}/items`, { items });
    setSavingOrderId(null);
    setEditingOrder(null);
    loadOrders();
  };

  const countdownLabel = useMemo(() => {
    return (order: AdminOrder) => {
      if (!order.eta_at || !["PREPARING", "SERVING"].includes(order.status)) return null;
      const diffMs = new Date(order.eta_at).getTime() - now;
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };
  }, [now]);

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
                <option key={option.value} value={option.value}>
                  {option.label}
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
            <Card key={order.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg">
                    {order.order_code}
                    {countdownLabel(order) && (
                      <span className="ml-2 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">
                        {countdownLabel(order)}
                      </span>
                    )}
                  </h3>
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

              <div className="space-y-2 text-sm">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.product_name_snapshot_en}</span>
                    <span>x{item.qty}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm text-[var(--text-muted)]">
                  Status
                  <select
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    value={order.status}
                    onChange={(event) => updateStatus(order.id, event.target.value)}
                  >
                    {statusOptions.filter((option) => option.value !== "ALL").map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {(order.status === "PREPARING" || order.status === "SERVING") && (
                  <Input
                    label="ETA (min)"
                    type="number"
                    min={1}
                    value={etaMap[order.id] ?? 10}
                    onChange={(event) =>
                      setEtaMap((prev) => ({ ...prev, [order.id]: Number(event.target.value) }))
                    }
                  />
                )}
                <Button variant="outline" onClick={() => startEditItems(order)}>
                  Adjust items
                </Button>
              </div>

              {editingOrder === order.id && (
                <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
                  <h4 className="font-medium">Adjust items</h4>
                  {(editingItems[order.id] ?? []).map((item, index) => {
                    const product = products.find((p) => p.id === item.productId);
                    return (
                      <div key={`${item.productId}-${index}`} className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)]">{product?.name_en ?? "Item"}</span>
                        <Input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(event) => updateEditItemQty(order.id, index, Number(event.target.value))}
                        />
                        <Button variant="ghost" onClick={() => removeEditItem(order.id, index)}>
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      onChange={(event) => {
                        addEditItem(order.id, event.target.value);
                        event.currentTarget.value = "";
                      }}
                    >
                      <option value="">Add product...</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name_en} (Tk {product.price_tk})
                        </option>
                      ))}
                    </select>
                    <Button onClick={() => saveEditItems(order.id)} disabled={savingOrderId === order.id}>
                      {savingOrderId === order.id ? "Saving..." : "Save items"}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingOrder(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
