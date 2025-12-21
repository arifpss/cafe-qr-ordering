import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Badge } from "../components/Badge";
import { apiFetch, apiPost } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import type { MenuResponse, Product } from "../lib/types";

interface CartItem {
  product: Product;
  qty: number;
}

export const CustomerOrderPage: React.FC = () => {
  const { tableCode } = useParams<{ tableCode: string }>();
  const { user, registerCustomer, loginGuest } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [notes, setNotes] = useState("");
  const [registerState, setRegisterState] = useState({ name: "", email: "", phone: "", password: "" });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [authChoice, setAuthChoice] = useState<"guest" | "create" | "login" | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!tableCode) return;
      setLoading(true);
      try {
        const data = await apiFetch<MenuResponse>(`/api/menu?tableCode=${tableCode}`);
        setMenu(data);
        setActiveCategory(data.categories[0]?.id ?? null);
      } catch (err) {
        setMenuError(err instanceof Error ? err.message : "Unable to load menu");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tableCode]);

  const products = useMemo(() => {
    if (!menu) return [] as Product[];
    const term = search.toLowerCase();
    return menu.products.filter((product) => {
      const name = lang === "bn" ? product.name_bn : product.name_en;
      const matchesSearch = name.toLowerCase().includes(term);
      const matchesCategory = !activeCategory || product.category_id === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menu, search, activeCategory, lang]);

  const featured = menu?.products.filter((product) => product.is_featured === 1) ?? [];
  const hotItems = menu?.products.filter((product) => product.is_hot === 1) ?? [];
  const trending = menu?.products.filter((product) => product.is_trending === 1) ?? [];

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.price_tk * item.qty, 0);
  const customerProfile = menu?.customer ?? user ?? null;
  const discountPercent = customerProfile?.discountPercent ?? 0;
  const discountAmount = Math.round((cartTotal * discountPercent) / 100);
  const totalAfter = Math.max(0, cartTotal - discountAmount);
  const discountedPrice = (price: number) => Math.max(0, Math.round(price * (1 - discountPercent / 100)));

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: {
          product,
          qty: existing ? existing.qty + 1 : 1
        }
      };
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      const nextQty = existing.qty + delta;
      if (nextQty <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...existing, qty: nextQty } };
    });
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setRegisterError(null);
    try {
      const data = await registerCustomer(registerState);
      setTempPassword(data.tempPassword);
      setAuthChoice(null);
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Unable to register");
    }
  };

  const handleGuest = async () => {
    setRegisterError(null);
    try {
      await loginGuest();
      setAuthChoice("guest");
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Unable to continue as guest");
    }
  };

  const handleOrder = async () => {
    if (!tableCode) return;
    if (cartItems.length === 0) return;
    if (!user) {
      setOrderError(t("loginRequiredToOrder"));
      return;
    }
    setOrderError(null);
    setPlacingOrder(true);
    try {
      const payload = {
        tableCode,
        notes,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          qty: item.qty
        }))
      };
      const data = await apiPost<{ orderId: string }>("/api/orders", payload);
      setCart({});
      navigate(`/order/${data.orderId}`);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Unable to place order");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-[var(--text-muted)]">Loading menu...</div>;
  }

  if (!menu || menuError) {
    return <div className="py-12 text-center text-red-400">{menuError ?? "Menu unavailable"}</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-6">
        <Card className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">{t("table")}</p>
              <h2 className="font-display text-2xl">{menu.table.label}</h2>
            </div>
            {customerProfile && (
              <div className="flex items-center gap-2">
                <Badge label={customerProfile.badge.displayName} />
                <span className="text-xs text-[var(--text-muted)]">
                  {t("discount")}: {customerProfile.discountPercent}%
                </span>
              </div>
            )}
          </div>
        </Card>

        {!user && (
          <Card className="space-y-4">
            <h3 className="font-display text-xl">{t("getStarted")}</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button onClick={handleGuest}>{t("continueAsGuest")}</Button>
              <Button variant="outline" onClick={() => setAuthChoice("create")}>
                {t("createAccount")}
              </Button>
              <Button variant="ghost" onClick={() => navigate("/login")}>
                {t("login")}
              </Button>
            </div>
            {authChoice === "create" && (
              <form className="space-y-3" onSubmit={handleRegister}>
                <Input label={t("name")} value={registerState.name} onChange={(event) => setRegisterState({ ...registerState, name: event.target.value })} />
                <Input label={t("email")} value={registerState.email} onChange={(event) => setRegisterState({ ...registerState, email: event.target.value })} />
                <Input label={t("phone")} value={registerState.phone} onChange={(event) => setRegisterState({ ...registerState, phone: event.target.value })} />
                <Input
                  label={t("passwordOptional")}
                  type="password"
                  value={registerState.password}
                  onChange={(event) => setRegisterState({ ...registerState, password: event.target.value })}
                />
                {registerError && <p className="text-xs text-red-400">{registerError}</p>}
                <Button type="submit" className="w-full">
                  {t("register")}
                </Button>
              </form>
            )}
            {tempPassword && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text-muted)]">
                Username (phone): <span className="text-[var(--primary)]">{registerState.phone}</span>
                <br />
                Temporary password: <span className="text-[var(--primary)]">{tempPassword}</span>
              </div>
            )}
            {registerError && !authChoice && <p className="text-xs text-red-400">{registerError}</p>}
          </Card>
        )}

        {featured.length > 0 && (
          <Card className="space-y-3">
            <h3 className="font-display text-lg">{t("featured")}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {featured.slice(0, 4).map((product) => (
                <button
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  onClick={() => addToCart(product)}
                >
                  <span>{lang === "bn" ? product.name_bn : product.name_en}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Tk {discountPercent > 0 ? discountedPrice(product.price_tk) : product.price_tk}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {hotItems.slice(0, 4).map((product) => (
            <Card key={product.id} className="space-y-2">
              <h4 className="font-display text-base">{lang === "bn" ? product.name_bn : product.name_en}</h4>
              <p className="text-xs text-[var(--text-muted)]">{lang === "bn" ? product.description_bn : product.description_en}</p>
              <span className="text-sm font-semibold">
                Tk {discountPercent > 0 ? discountedPrice(product.price_tk) : product.price_tk}
              </span>
              <Button onClick={() => addToCart(product)}>{t("hot")}</Button>
            </Card>
          ))}
          {trending.slice(0, 4).map((product) => (
            <Card key={product.id} className="space-y-2">
              <h4 className="font-display text-base">{lang === "bn" ? product.name_bn : product.name_en}</h4>
              <p className="text-xs text-[var(--text-muted)]">{lang === "bn" ? product.description_bn : product.description_en}</p>
              <span className="text-sm font-semibold">
                Tk {discountPercent > 0 ? discountedPrice(product.price_tk) : product.price_tk}
              </span>
              <Button onClick={() => addToCart(product)}>{t("trending")}</Button>
            </Card>
          ))}
        </div>

        <Card className="space-y-3">
          <Input label={t("search")} value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            {menu.categories.map((category) => (
              <button
                key={category.id}
                className={`rounded-full border px-3 py-1 text-xs ${activeCategory === category.id ? "border-[var(--primary)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--text-muted)]"}`}
                onClick={() => setActiveCategory(category.id)}
              >
                {lang === "bn" ? category.name_bn : category.name_en}
              </button>
            ))}
          </div>
        </Card>

        {menu.previousItems && menu.previousItems.length > 0 && (
          <Card className="space-y-3">
            <h3 className="font-display text-lg">Previously ordered</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {menu.previousItems.map((product) => (
                <button
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  onClick={() => addToCart(product)}
                >
                  <span>{lang === "bn" ? product.name_bn : product.name_en}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Tk {discountPercent > 0 ? discountedPrice(product.price_tk) : product.price_tk}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <Card key={product.id} className="space-y-2">
              {product.media_image_url && (
                <img src={product.media_image_url} alt={product.name_en} className="h-32 w-full rounded-xl object-cover" />
              )}
              <div className="flex items-center justify-between">
                <h4 className="font-display text-lg">{lang === "bn" ? product.name_bn : product.name_en}</h4>
                <span className="text-sm font-semibold">
                  Tk {discountPercent > 0 ? discountedPrice(product.price_tk) : product.price_tk}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{lang === "bn" ? product.description_bn : product.description_en}</p>
              <Button onClick={() => addToCart(product)}>{t("addToCart")}</Button>
            </Card>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <Card className="space-y-3">
          <h3 className="font-display text-xl">{t("cart")}</h3>
          {cartItems.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t("emptyCart")}</p>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{lang === "bn" ? item.product.name_bn : item.product.name_en}</p>
                    <p className="text-xs text-[var(--text-muted)]">Tk {item.product.price_tk}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-lg" onClick={() => updateQty(item.product.id, -1)}>
                      -
                    </button>
                    <span>{item.qty}</span>
                    <button className="text-lg" onClick={() => updateQty(item.product.id, 1)}>
                      +
                    </button>
                  </div>
                </div>
              ))}
              <Input label={t("notes")} value={notes} onChange={(event) => setNotes(event.target.value)} />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{t("total")}</span>
                  <span>Tk {cartTotal}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-[var(--accent)]">
                    <span>{t("discount")}</span>
                    <span>- Tk {discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>{t("total")}</span>
                  <span>Tk {totalAfter}</span>
                </div>
              </div>
              {orderError && <p className="text-xs text-red-400">{orderError}</p>}
              <Button onClick={handleOrder} disabled={!user || placingOrder}>
                {t("placeOrder")}
              </Button>
              {!user && <p className="text-xs text-[var(--text-muted)]">Please create an account to place orders.</p>}
            </div>
          )}
        </Card>
      </aside>
    </div>
  );
};
