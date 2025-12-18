import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { apiFetch, apiPost } from "../lib/api";
import { useTheme } from "../lib/theme";
import type { Category, Product, ThemeName } from "../lib/types";

interface Paginated<T> {
  items: T[];
  total: number;
}

interface BadgeLevel {
  key: string;
  display_name_en: string;
  display_name_bn: string;
  min_points: number;
  discount_percent: number;
}

interface AdminUser {
  id: string;
  role: string;
  name: string;
  email?: string | null;
  phone: string;
  must_change_password?: number;
  is_active?: number;
}

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("products");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [badges, setBadges] = useState<BadgeLevel[]>([]);
  const [reportRange, setReportRange] = useState("daily");
  const [reports, setReports] = useState<{ period: string; total: number }[]>([]);
  const [badgeDistribution, setBadgeDistribution] = useState<{ key: string; label: string; count: number }[]>([]);
  const [bestItems, setBestItems] = useState<{ name: string; qty: number }[]>([]);
  const { theme, setTheme, refreshTheme } = useTheme();

  const [categoryForm, setCategoryForm] = useState({ id: "", name_en: "", name_bn: "", slug: "", sort_order: 0 });
  const [productForm, setProductForm] = useState({
    id: "",
    name_en: "",
    name_bn: "",
    description_en: "",
    description_bn: "",
    category_id: "",
    price_tk: 0,
    slug: "",
    is_featured: false,
    is_hot: false,
    is_trending: false,
    media_image_url: "",
    media_video_url: ""
  });
  const [userForm, setUserForm] = useState({ name: "", phone: "", email: "", role: "employee", password: "" });

  const loadCategories = async () => {
    const data = await apiFetch<Paginated<Category>>("/api/admin/categories?page=1&pageSize=100");
    setCategories(data.items);
  };

  const loadProducts = async () => {
    const data = await apiFetch<Paginated<Product>>("/api/admin/products?page=1&pageSize=200");
    setProducts(data.items);
  };

  const loadUsers = async () => {
    const data = await apiFetch<Paginated<AdminUser>>("/api/admin/users?page=1&pageSize=200");
    setUsers(data.items);
  };

  const loadBadges = async () => {
    const data = await apiFetch<{ badges: BadgeLevel[] }>("/api/admin/settings/discounts");
    setBadges(data.badges);
  };

  const loadReports = async () => {
    const data = await apiFetch<{ rows: { period: string; total: number }[] }>(
      `/api/admin/reports/sales?range=${reportRange}`
    );
    setReports(data.rows);
  };

  const loadBadgeDistribution = async () => {
    const data = await apiFetch<{ distribution: { key: string; label: string; count: number }[] }>(
      "/api/admin/reports/badges"
    );
    setBadgeDistribution(data.distribution);
  };

  const loadBestItems = async () => {
    const data = await apiFetch<{ items: { name: string; qty: number }[] }>(
      "/api/admin/reports/best-items"
    );
    setBestItems(data.items);
  };

  useEffect(() => {
    loadCategories();
    loadProducts();
    loadUsers();
    loadBadges();
    refreshTheme();
    loadBadgeDistribution();
    loadBestItems();
  }, []);

  useEffect(() => {
    if (!productForm.category_id && categories.length > 0) {
      setProductForm((prev) => ({ ...prev, category_id: categories[0].id }));
    }
  }, [categories, productForm.category_id]);

  useEffect(() => {
    loadReports();
  }, [reportRange]);

  const handleCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (categoryForm.id) {
      await apiFetch(`/api/admin/categories/${categoryForm.id}`, {
        method: "PUT",
        body: JSON.stringify(categoryForm)
      });
    } else {
      await apiPost("/api/admin/categories", categoryForm);
    }
    setCategoryForm({ id: "", name_en: "", name_bn: "", slug: "", sort_order: 0 });
    loadCategories();
  };

  const handleProductSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      ...productForm,
      price_tk: Number(productForm.price_tk)
    };
    if (productForm.id) {
      await apiFetch(`/api/admin/products/${productForm.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await apiPost("/api/admin/products", payload);
    }
    setProductForm({
      id: "",
      name_en: "",
      name_bn: "",
      description_en: "",
      description_bn: "",
      category_id: categories[0]?.id ?? "",
      price_tk: 0,
      slug: "",
      is_featured: false,
      is_hot: false,
      is_trending: false,
      media_image_url: "",
      media_video_url: ""
    });
    loadProducts();
  };

  const handleUserSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiPost("/api/admin/users", userForm);
    setUserForm({ name: "", phone: "", email: "", role: "employee", password: "" });
    loadUsers();
  };

  const updateTheme = async (next: ThemeName) => {
    setTheme(next);
    await apiPost("/api/admin/settings/theme", { theme: next });
  };

  const updateDiscount = async (key: string, discountPercent: number) => {
    const updated = badges.map((badge) => (badge.key === key ? { ...badge, discount_percent: discountPercent } : badge));
    setBadges(updated);
    await apiPost("/api/admin/settings/discounts", { badges: updated });
  };

  const tabs = useMemo(
    () => [
      { id: "products", label: "Products" },
      { id: "categories", label: "Categories" },
      { id: "users", label: "Users" },
      { id: "reports", label: "Reports" },
      { id: "settings", label: "Settings" }
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`rounded-full border px-4 py-1 text-sm ${activeTab === tab.id ? "border-[var(--primary)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--text-muted)]"}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "categories" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Card>
            <h3 className="font-display text-lg">Create category</h3>
            <form className="space-y-2" onSubmit={handleCategorySubmit}>
              <Input label="Name (EN)" value={categoryForm.name_en} onChange={(event) => setCategoryForm({ ...categoryForm, name_en: event.target.value })} />
              <Input label="Name (BN)" value={categoryForm.name_bn} onChange={(event) => setCategoryForm({ ...categoryForm, name_bn: event.target.value })} />
              <Input label="Slug" value={categoryForm.slug} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })} />
              <Input label="Sort order" type="number" value={categoryForm.sort_order} onChange={(event) => setCategoryForm({ ...categoryForm, sort_order: Number(event.target.value) })} />
              <Button type="submit">Save</Button>
            </form>
          </Card>
          <Card>
            <h3 className="font-display text-lg">Categories</h3>
            <div className="space-y-2 text-sm">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div>
                    <p className="font-medium">{category.name_en}</p>
                    <p className="text-xs text-[var(--text-muted)]">{category.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCategoryForm({
                        id: category.id,
                        name_en: category.name_en,
                        name_bn: category.name_bn,
                        slug: category.slug,
                        sort_order: category.sort_order
                      })}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await apiFetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
                        loadCategories();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "products" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Card>
            <h3 className="font-display text-lg">Create product</h3>
            <form className="space-y-2" onSubmit={handleProductSubmit}>
              <Input label="Name (EN)" value={productForm.name_en} onChange={(event) => setProductForm({ ...productForm, name_en: event.target.value })} />
              <Input label="Name (BN)" value={productForm.name_bn} onChange={(event) => setProductForm({ ...productForm, name_bn: event.target.value })} />
              <Input label="Description (EN)" value={productForm.description_en} onChange={(event) => setProductForm({ ...productForm, description_en: event.target.value })} />
              <Input label="Description (BN)" value={productForm.description_bn} onChange={(event) => setProductForm({ ...productForm, description_bn: event.target.value })} />
              <label className="text-sm text-[var(--text-muted)]">
                Category
                <select
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  value={productForm.category_id}
                  onChange={(event) => setProductForm({ ...productForm, category_id: event.target.value })}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name_en}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Price (Tk)" type="number" value={productForm.price_tk} onChange={(event) => setProductForm({ ...productForm, price_tk: Number(event.target.value) })} />
              <Input label="Slug" value={productForm.slug} onChange={(event) => setProductForm({ ...productForm, slug: event.target.value })} />
              <Input label="Image URL" value={productForm.media_image_url} onChange={(event) => setProductForm({ ...productForm, media_image_url: event.target.value })} />
              <Input label="Video URL" value={productForm.media_video_url} onChange={(event) => setProductForm({ ...productForm, media_video_url: event.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={productForm.is_featured} onChange={(event) => setProductForm({ ...productForm, is_featured: event.target.checked })} />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={productForm.is_hot} onChange={(event) => setProductForm({ ...productForm, is_hot: event.target.checked })} />
                Hot
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={productForm.is_trending} onChange={(event) => setProductForm({ ...productForm, is_trending: event.target.checked })} />
                Trending
              </label>
              <Button type="submit">Save</Button>
            </form>
          </Card>
          <Card>
            <h3 className="font-display text-lg">Products</h3>
            <div className="space-y-2 text-sm">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div>
                    <p className="font-medium">{product.name_en}</p>
                    <p className="text-xs text-[var(--text-muted)]">Tk {product.price_tk}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setProductForm({
                          id: product.id,
                          name_en: product.name_en,
                          name_bn: product.name_bn,
                          description_en: product.description_en,
                          description_bn: product.description_bn,
                          category_id: product.category_id,
                          price_tk: product.price_tk,
                          slug: product.slug,
                          is_featured: Boolean(product.is_featured),
                          is_hot: Boolean(product.is_hot),
                          is_trending: Boolean(product.is_trending),
                          media_image_url: product.media_image_url ?? "",
                          media_video_url: product.media_video_url ?? ""
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await apiFetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
                        loadProducts();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "users" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Card>
            <h3 className="font-display text-lg">Create staff</h3>
            <form className="space-y-2" onSubmit={handleUserSubmit}>
              <Input label="Name" value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} />
              <Input label="Phone" value={userForm.phone} onChange={(event) => setUserForm({ ...userForm, phone: event.target.value })} />
              <Input label="Email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} />
              <label className="text-sm text-[var(--text-muted)]">
                Role
                <select
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  value={userForm.role}
                  onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}
                >
                  <option value="employee">Employee</option>
                  <option value="chef">Chef</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <Input label="Password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} />
              <Button type="submit">Create</Button>
            </form>
          </Card>
          <Card>
            <h3 className="font-display text-lg">Users</h3>
            <div className="space-y-2 text-sm">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{u.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await apiFetch(`/api/admin/users/${u.id}`, {
                          method: "PUT",
                          body: JSON.stringify({ role: u.role === "employee" ? "chef" : "employee" })
                        });
                        loadUsers();
                      }}
                    >
                      Toggle role
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await apiFetch(`/api/admin/users/${u.id}`, {
                          method: "PUT",
                          body: JSON.stringify({ is_active: 0 })
                        });
                        loadUsers();
                      }}
                    >
                      Deactivate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {"daily,monthly,yearly".split(",").map((range) => (
              <button
                key={range}
                className={`rounded-full border px-3 py-1 text-xs ${reportRange === range ? "border-[var(--primary)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--text-muted)]"}`}
                onClick={() => setReportRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
          <Card className="space-y-2">
            {reports.map((row) => (
              <div key={row.period} className="flex justify-between text-sm">
                <span>{row.period}</span>
                <span>Tk {row.total}</span>
              </div>
            ))}
          </Card>
          <Card className="space-y-2">
            <h4 className="font-display text-lg">Best items</h4>
            {bestItems.map((item) => (
              <div key={item.name} className="flex justify-between text-sm">
                <span>{item.name}</span>
                <span>{item.qty}</span>
              </div>
            ))}
          </Card>
          <Card className="space-y-2">
            <h4 className="font-display text-lg">Badge distribution</h4>
            {badgeDistribution.map((badge) => (
              <div key={badge.key} className="flex justify-between text-sm">
                <span>{badge.label}</span>
                <span>{badge.count}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <h3 className="font-display text-lg">Theme</h3>
            {(["cyberpunk", "windows11", "apple"] as ThemeName[]).map((option) => (
              <button
                key={option}
                className={`w-full rounded-xl border px-4 py-2 text-left text-sm ${theme === option ? "border-[var(--primary)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--text-muted)]"}`}
                onClick={() => updateTheme(option)}
              >
                {option}
              </button>
            ))}
          </Card>
          <Card className="space-y-3">
            <h3 className="font-display text-lg">Discounts</h3>
            <div className="space-y-2">
              {badges.map((badge) => (
                <div key={badge.key} className="flex items-center justify-between text-sm">
                  <span>{badge.display_name_en}</span>
                  <input
                    className="w-20 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-right"
                    type="number"
                    value={badge.discount_percent}
                    onChange={(event) => updateDiscount(badge.key, Number(event.target.value))}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
