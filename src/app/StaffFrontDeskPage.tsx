import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { apiFetch, apiPost } from "../lib/api";
import { playTing } from "../lib/sound";
import type { Order } from "../lib/types";

interface StaffOrder extends Order {
  items: Order["items"];
  table_label?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
}

export const StaffFrontDeskPage: React.FC = () => {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [etaMap, setEtaMap] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [products, setProducts] = useState<{ id: string; name_en: string; price_tk: number }[]>([]);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<Record<string, { productId: string; qty: number }[]>>({});
  const [editingCustomer, setEditingCustomer] = useState<Record<string, { name: string; email: string; phone: string; password: string }>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const pendingAlertRef = useRef<Map<string, number>>(new Map());
  const etaAlertRef = useRef<Map<string, number>>(new Map());

  const loadOrders = async () => {
    const data = await apiFetch<{ orders: StaffOrder[] }>(
      "/api/staff/orders?status=RECEIVED,PREPARING,SERVING,SERVED,PAYMENT_RECEIVED,CANCELLED"
    );
    const newIds = new Set(data.orders.map((order) => order.id));
    const prevIds = prevIdsRef.current;
    const hasNew = data.orders.some((order) => !prevIds.has(order.id));
    if (prevIds.size && hasNew) {
      playTing();
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

  useEffect(() => {
    orders.forEach((order) => {
      if (order.status !== "RECEIVED") return;
      const placedAt = new Date(order.placed_at).getTime();
      if (now - placedAt < 60_000) return;
      const lastAlert = pendingAlertRef.current.get(order.id) ?? 0;
      if (now - lastAlert >= 60_000) {
        playTing();
        setNotification(`Order pending: ${order.order_code}`);
        setTimeout(() => setNotification(null), 3000);
        pendingAlertRef.current.set(order.id, now);
      }
    });
    orders.forEach((order) => {
      if (!order.eta_at || !["PREPARING", "SERVING"].includes(order.status)) return;
      const etaAt = new Date(order.eta_at).getTime();
      if (etaAt > now) return;
      const lastAlert = etaAlertRef.current.get(order.id) ?? 0;
      if (now - lastAlert >= 60_000) {
        playTing();
        setNotification(`ETA reached: ${order.order_code}`);
        setTimeout(() => setNotification(null), 3000);
        etaAlertRef.current.set(order.id, now);
      }
    });
  }, [orders, now]);

  const updateStatus = async (id: string, status: string) => {
    const etaMinutes =
      status === "PREPARING" || status === "SERVING" ? etaMap[id] ?? 10 : undefined;
    await apiPost(`/api/staff/orders/${id}/status`, { status, etaMinutes });
    loadOrders();
  };

  const startEditItems = (order: StaffOrder) => {
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

  const updateCustomerForm = (order: StaffOrder) => {
    if (!order.customer_id) return;
    setEditingCustomer((prev) => ({
      ...prev,
      [order.customer_id!]: {
        name: order.customer_name ?? "",
        email: "",
        phone: order.customer_phone ?? "",
        password: ""
      }
    }));
  };

  const saveCustomer = async (customerId: string) => {
    const payload = editingCustomer[customerId];
    if (!payload) return;
    await apiPost(`/api/staff/customers/${customerId}`, {
      name: payload.name || undefined,
      email: payload.email || undefined,
      phone: payload.phone || undefined,
      password: payload.password || undefined
    });
    loadOrders();
  };

  const countdownLabel = useMemo(() => {
    return (order: StaffOrder) => {
      if (!order.eta_at || !["PREPARING", "SERVING"].includes(order.status)) return null;
      const diffMs = new Date(order.eta_at).getTime() - now;
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };
  }, [now]);

  const statusOptions = [
    { value: "RECEIVED", label: "Received" },
    { value: "PREPARING", label: "Preparing" },
    { value: "SERVING", label: "Serving" },
    { value: "SERVED", label: "Served" },
    { value: "PAYMENT_RECEIVED", label: "Payment received" },
    { value: "CANCELLED", label: "Cancelled" }
  ];

  const statusLabel = (status: string) =>
    statusOptions.find((option) => option.value === status)?.label ?? status;

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
                  <h3 className="font-display text-lg">
                    {order.order_code}
                    {countdownLabel(order) && (
                      <span className="ml-2 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">
                        {countdownLabel(order)}
                      </span>
                    )}
                  </h3>
                </div>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                  {statusLabel(order.status)}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {order.customer_name ?? "Guest"} placed order at {order.table_label}. Go and check with the customer and change order status.
              </p>
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
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="ETA (min) for Preparing/Serving"
                  type="number"
                  min={1}
                  value={etaMap[order.id] ?? 10}
                  onChange={(event) =>
                    setEtaMap((prev) => ({ ...prev, [order.id]: Number(event.target.value) }))
                  }
                />
                <Button variant="outline" onClick={() => startEditItems(order)}>
                  Adjust items
                </Button>
                {order.customer_id && !order.customer_phone?.startsWith("GUEST-") && (
                  <Button variant="ghost" onClick={() => updateCustomerForm(order)}>
                    Edit customer
                  </Button>
                )}
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
              {order.customer_id && editingCustomer[order.customer_id] && (
                <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
                  <h4 className="font-medium">Edit customer</h4>
                  <Input
                    label="Name"
                    value={editingCustomer[order.customer_id].name}
                    onChange={(event) =>
                      setEditingCustomer((prev) => ({
                        ...prev,
                        [order.customer_id!]: { ...prev[order.customer_id!], name: event.target.value }
                      }))
                    }
                  />
                  <Input
                    label="Email"
                    value={editingCustomer[order.customer_id].email}
                    onChange={(event) =>
                      setEditingCustomer((prev) => ({
                        ...prev,
                        [order.customer_id!]: { ...prev[order.customer_id!], email: event.target.value }
                      }))
                    }
                  />
                  <Input
                    label="Phone"
                    value={editingCustomer[order.customer_id].phone}
                    onChange={(event) =>
                      setEditingCustomer((prev) => ({
                        ...prev,
                        [order.customer_id!]: { ...prev[order.customer_id!], phone: event.target.value }
                      }))
                    }
                  />
                  <Input
                    label="Set password (min 3)"
                    type="password"
                    value={editingCustomer[order.customer_id].password}
                    onChange={(event) =>
                      setEditingCustomer((prev) => ({
                        ...prev,
                        [order.customer_id!]: { ...prev[order.customer_id!], password: event.target.value }
                      }))
                    }
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => saveCustomer(order.customer_id!)}>Save customer</Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setEditingCustomer((prev) => {
                          const next = { ...prev };
                          delete next[order.customer_id!];
                          return next;
                        })
                      }
                    >
                      Close
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
