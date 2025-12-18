import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { apiFetch, apiPost } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { Order } from "../lib/types";

interface OrderResponse {
  order: Order;
  reviewed: boolean;
}

export const CustomerStatusPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { t } = useI18n();
  const [order, setOrder] = useState<Order | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [rating, setRating] = useState(10);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const data = await apiFetch<OrderResponse>(`/api/orders/${orderId}`);
      setOrder(data.order);
      setReviewed(data.reviewed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load order");
    }
  };

  useEffect(() => {
    fetchOrder();
    const timer = setInterval(fetchOrder, 4000);
    return () => clearInterval(timer);
  }, [orderId]);

  const etaRemaining = useMemo(() => {
    if (!order?.eta_at) return null;
    const diffMs = new Date(order.eta_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / 60000));
  }, [order?.eta_at]);

  const submitReview = async () => {
    if (!orderId) return;
    try {
      await apiPost(`/api/orders/${orderId}/review`, { rating, comment });
      setReviewed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit review");
    }
  };

  if (!order && !error) {
    return <div className="py-12 text-center text-[var(--text-muted)]">Loading order...</div>;
  }

  if (error) {
    return <div className="py-12 text-center text-red-400">{error}</div>;
  }

  if (!order) return null;

  return (
    <div className="space-y-6">
      <Card className="space-y-2">
        <h2 className="font-display text-2xl">{t("orderStatus")}</h2>
        <p className="text-sm text-[var(--text-muted)]">{order.order_code}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-[var(--border)] px-3 py-1">{order.status}</span>
          {order.eta_minutes && (
            <span className="rounded-full border border-[var(--border)] px-3 py-1">
              {t("eta")}: {etaRemaining ?? order.eta_minutes} {t("minutes")}
            </span>
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-display text-lg">Items</h3>
        <div className="space-y-2 text-sm">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>{item.product_name_snapshot_en}</span>
              <span>
                {item.qty} x Tk {item.unit_price_snapshot_tk}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {order.status === "SERVED" && !reviewed && (
        <Card className="space-y-3">
          <h3 className="font-display text-lg">{t("ratingPrompt")}</h3>
          <Input
            label="Rating (1-10)"
            type="number"
            min={1}
            max={10}
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
          />
          <Input label={t("reviewOptional")} value={comment} onChange={(event) => setComment(event.target.value)} />
          <Button onClick={submitReview}>{t("submitReview")}</Button>
        </Card>
      )}

      {order.status === "SERVED" && reviewed && (
        <Card className="text-center text-sm text-[var(--text-muted)]">{t("reviewThanks")}</Card>
      )}
    </div>
  );
};
