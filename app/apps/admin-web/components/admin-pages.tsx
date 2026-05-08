"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type React from "react";
import { useState } from "react";

import { AdminSection, AssetUploadField, Button, Chip, EmptyAdminState, EntitySelect, Input, NumberInput, Switch, TextArea } from "@/components/admin-ui";
import { queryClient, trpc } from "@/lib/trpc";

const statuses = [
  { key: "to_call", label: "A appeler" },
  { key: "called", label: "Client appele" },
  { key: "processing", label: "En traitement" },
  { key: "processed", label: "Commande traitee" },
  { key: "cancelled", label: "Annulee" },
] as const;

const emptyProduct = {
  nameFr: "",
  nameAr: "",
  unitPrice: "0",
  lotQuantity: 1,
  packagingLabel: "Carton",
  brandId: "",
  categoryIds: [] as string[],
  imageAssetId: "",
  stockLots: 0,
  lowStockThreshold: 0,
  sku: "",
  description: "",
  badgeLabel: "",
  badgeColor: "#E74888",
  discountLotPrice: "",
  sortOrder: 0,
};

function PageHead({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div className="page-title">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const color = status === "cancelled" ? "danger" : status === "processed" ? "success" : status === "processing" ? "warning" : undefined;
  return <Chip color={color}>{statuses.find((entry) => entry.key === status)?.label ?? status}</Chip>;
}

function ProductForm({ mode }: { mode: "create" }) {
  const [form, setForm] = useState(emptyProduct);
  const brands = useQuery(trpc.adminCatalog.brands.list.queryOptions());
  const categories = useQuery(trpc.adminCatalog.categories.list.queryOptions());
  const createProduct = useMutation(trpc.adminCatalog.products.create.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));

  return (
    <AdminSection title={mode === "create" ? "Create product" : "Product"} description="Published immediately. Archive products when they should disappear from the mobile catalogue.">
      <div className="form-grid">
        <Input label="French name" value={form.nameFr} onValueChange={(nameFr) => setForm({ ...form, nameFr })} />
        <Input label="Arabic name" value={form.nameAr} onValueChange={(nameAr) => setForm({ ...form, nameAr })} />
        <Input label="Unit price (DA)" value={form.unitPrice} onValueChange={(unitPrice) => setForm({ ...form, unitPrice })} />
        <NumberInput label="Lot quantity" value={form.lotQuantity} onChange={(lotQuantity) => setForm({ ...form, lotQuantity })} />
        <Input label="Packaging" value={form.packagingLabel} onValueChange={(packagingLabel) => setForm({ ...form, packagingLabel })} />
        <EntitySelect label="Brand" value={form.brandId} onChange={(brandId) => setForm({ ...form, brandId })} items={(brands.data ?? []).map((brand) => ({ id: brand.id, label: brand.name }))} />
        <Input label="Category IDs" value={form.categoryIds.join(",")} onValueChange={(value) => setForm({ ...form, categoryIds: value.split(",").map((entry) => entry.trim()).filter(Boolean) })} placeholder="category-1,category-2" />
        <NumberInput label="Stock lots" value={form.stockLots} onChange={(stockLots) => setForm({ ...form, stockLots })} />
        <NumberInput label="Low-stock threshold" value={form.lowStockThreshold} onChange={(lowStockThreshold) => setForm({ ...form, lowStockThreshold })} />
        <Input label="SKU" value={form.sku} onValueChange={(sku) => setForm({ ...form, sku })} />
        <Input label="Badge label" value={form.badgeLabel} onValueChange={(badgeLabel) => setForm({ ...form, badgeLabel })} />
        <Input label="Discount lot price" value={form.discountLotPrice} onValueChange={(discountLotPrice) => setForm({ ...form, discountLotPrice })} />
      </div>
      <AssetUploadField kind="product" value={form.imageAssetId} onChange={(imageAssetId) => setForm({ ...form, imageAssetId })} />
      <TextArea label="Description" value={form.description} onValueChange={(description) => setForm({ ...form, description })} rows={4} />
      <div className="button-row">
        <Button isLoading={createProduct.isPending} onPress={() => createProduct.mutate({ ...form, discountLotPrice: form.discountLotPrice || undefined, imageAssetId: form.imageAssetId || undefined })}>Create product</Button>
        <span className="muted">Available categories: {(categories.data ?? []).map((category) => category.id).join(", ") || "none"}</span>
      </div>
      {createProduct.error ? <p className="form-error">{createProduct.error.message}</p> : null}
    </AdminSection>
  );
}

export function DashboardPageClient() {
  const orders = useQuery(trpc.orders.adminList.queryOptions({ status: "to_call" }));
  const products = useQuery(trpc.adminCatalog.products.list.queryOptions());
  const stockMovements = useQuery(trpc.orders.adminStockMovements.queryOptions());
  const lowStock = (products.data ?? []).filter((product) => product.lowStockThreshold !== null && product.stockLots <= product.lowStockThreshold);
  const incomplete = (products.data ?? []).filter((product) => !product.image || product.stockLots === 0 || !product.description || product.categories.length === 0 || product.brand?.isActive === false);

  return (
    <main className="page">
      <PageHead title="Operations dashboard" description="Prioritized work for today: calls, stock alerts, and catalogue cleanup." />
      <div className="grid-3">
        <div className="card metric"><span>Orders to call</span><strong>{orders.data?.length ?? 0}</strong></div>
        <div className="card metric"><span>Low-stock products</span><strong>{lowStock.length}</strong></div>
        <div className="card metric"><span>Incomplete products</span><strong>{incomplete.length}</strong></div>
      </div>
      <div className="grid-2">
        <AdminSection title="Orders to call"><SimpleOrderTable orders={orders.data ?? []} /></AdminSection>
        <AdminSection title="Low stock alerts">
          {lowStock.map((product) => <p key={product.id}><strong>{product.nameFr}</strong> · {product.stockLots} lots · threshold {product.lowStockThreshold}</p>)}
          {lowStock.length === 0 ? <EmptyAdminState label="No low-stock alerts." /> : null}
        </AdminSection>
      </div>
      <AdminSection title="Latest stock movements">
        <table className="table"><tbody>{(stockMovements.data ?? []).slice(0, 8).map((movement) => <tr key={movement.id}><td>{movement.product?.nameFr}</td><td>{movement.reason}</td><td>{movement.quantityLotsDelta} lots</td></tr>)}</tbody></table>
      </AdminSection>
    </main>
  );
}

function SimpleOrderTable({ orders }: { orders: Array<{ id: string; orderNumber: string; customerFullNameSnapshot: string; status: string; totalAmountSnapshot: string }> }) {
  if (orders.length === 0) return <EmptyAdminState label="No orders here." />;
  return <table className="table"><tbody>{orders.map((order) => <tr key={order.id}><td><Link href={`/orders/${order.id}`}><strong>{order.orderNumber}</strong></Link><br /><span className="muted">{order.customerFullNameSnapshot}</span></td><td><StatusChip status={order.status} /></td><td>{order.totalAmountSnapshot} DA</td></tr>)}</tbody></table>;
}

export function ProductsPageClient() {
  const products = useQuery(trpc.adminCatalog.products.list.queryOptions());
  const archiveProduct = useMutation(trpc.adminCatalog.products.archive.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  return (
    <main className="page">
      <PageHead title="Products" description="Create products, maintain pricing and stock, and archive products without losing history." />
      <ProductForm mode="create" />
      <AdminSection title="Product catalogue">
        <table className="table"><thead><tr><th>Product</th><th>Brand</th><th>Categories</th><th>Stock</th><th>Lot price</th><th></th></tr></thead><tbody>{(products.data ?? []).map((product) => <tr key={product.id}><td><div className="entity-title"><strong>{product.nameFr}</strong><span>{product.nameAr}</span></div>{product.isArchived ? <Chip color="warning">Archived</Chip> : null}</td><td>{product.brand?.name ?? "No brand"}</td><td>{product.categories.map((category) => category.nameFr).join(", ") || "-"}</td><td>{product.stockLots} lots</td><td>{product.lotPrice} DA</td><td><Button size="sm" variant="flat" onPress={() => archiveProduct.mutate({ id: product.id, isArchived: !product.isArchived })}>{product.isArchived ? "Restore" : "Archive"}</Button></td></tr>)}</tbody></table>
      </AdminSection>
    </main>
  );
}

export function CategoriesPageClient() {
  const categories = useQuery(trpc.adminCatalog.categories.list.queryOptions());
  const [form, setForm] = useState({ nameFr: "", nameAr: "", imageAssetId: "", isActive: true, isFeatured: true, sortOrder: 0 });
  const createCategory = useMutation(trpc.adminCatalog.categories.create.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  return <TaxonomyPage title="Categories" description="Active categories appear in the mobile category page even before they contain products." items={categories.data ?? []} form={<><Input label="French name" value={form.nameFr} onValueChange={(nameFr) => setForm({ ...form, nameFr })} /><Input label="Arabic name" value={form.nameAr} onValueChange={(nameAr) => setForm({ ...form, nameAr })} /><AssetUploadField kind="category" value={form.imageAssetId} onChange={(imageAssetId) => setForm({ ...form, imageAssetId })} /><Switch isSelected={form.isActive} onValueChange={(isActive) => setForm({ ...form, isActive })}>Active</Switch><Switch isSelected={form.isFeatured} onValueChange={(isFeatured) => setForm({ ...form, isFeatured })}>Featured on Home</Switch><NumberInput label="Sort order" value={form.sortOrder} onChange={(sortOrder) => setForm({ ...form, sortOrder })} /><Button isLoading={createCategory.isPending} onPress={() => createCategory.mutate({ ...form, imageAssetId: form.imageAssetId || undefined })}>Create category</Button></>} />;
}

export function BrandsPageClient() {
  const brands = useQuery(trpc.adminCatalog.brands.list.queryOptions());
  const [form, setForm] = useState({ name: "", logoAssetId: "", isActive: true, isFeatured: true, sortOrder: 0 });
  const createBrand = useMutation(trpc.adminCatalog.brands.create.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  return <TaxonomyPage title="Brands" description="Manage brand visibility and Home featuring." items={(brands.data ?? []).map((brand) => ({ ...brand, nameFr: brand.name, nameAr: "" }))} form={<><Input label="Name" value={form.name} onValueChange={(name) => setForm({ ...form, name })} /><AssetUploadField kind="brand" value={form.logoAssetId} onChange={(logoAssetId) => setForm({ ...form, logoAssetId })} /><Switch isSelected={form.isActive} onValueChange={(isActive) => setForm({ ...form, isActive })}>Active</Switch><Switch isSelected={form.isFeatured} onValueChange={(isFeatured) => setForm({ ...form, isFeatured })}>Featured on Home</Switch><NumberInput label="Sort order" value={form.sortOrder} onChange={(sortOrder) => setForm({ ...form, sortOrder })} /><Button isLoading={createBrand.isPending} onPress={() => createBrand.mutate({ ...form, logoAssetId: form.logoAssetId || undefined })}>Create brand</Button></>} />;
}

function TaxonomyPage({ title, description, form, items }: { title: string; description: string; form: React.ReactNode; items: Array<{ id: string; nameFr: string; nameAr?: string; isActive: boolean; isFeatured: boolean; sortOrder: number }> }) {
  return <main className="page"><PageHead title={title} description={description} /><div className="grid-2"><AdminSection title={`Create ${title.toLowerCase().slice(0, -1)}`}><div className="form-stack">{form}</div></AdminSection><AdminSection title={`Current ${title.toLowerCase()}`}><table className="table"><tbody>{items.map((item) => <tr key={item.id}><td><div className="entity-title"><strong>{item.nameFr}</strong><span>{item.id}</span></div></td><td>{item.isActive ? <Chip color="success">Active</Chip> : <Chip color="danger">Inactive</Chip>}</td><td>{item.isFeatured ? <Chip>Featured</Chip> : null}</td><td>{item.sortOrder}</td></tr>)}</tbody></table>{items.length === 0 ? <EmptyAdminState label="No records yet." /> : null}</AdminSection></div></main>;
}

export function BannersPageClient() {
  const banners = useQuery(trpc.adminCatalog.banners.list.queryOptions());
  const [form, setForm] = useState({ imageAssetId: "", isActive: true, sortOrder: 0 });
  const createBanner = useMutation(trpc.adminCatalog.banners.create.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  return <main className="page"><PageHead title="Banners" description="Banners require an image and appear in the mobile Home carousel." /><div className="grid-2"><AdminSection title="Create banner"><AssetUploadField kind="banner" value={form.imageAssetId} onChange={(imageAssetId) => setForm({ ...form, imageAssetId })} /><Switch isSelected={form.isActive} onValueChange={(isActive) => setForm({ ...form, isActive })}>Active</Switch><NumberInput label="Sort order" value={form.sortOrder} onChange={(sortOrder) => setForm({ ...form, sortOrder })} /><Button isLoading={createBanner.isPending} onPress={() => createBanner.mutate(form)}>Create banner</Button></AdminSection><AdminSection title="Current banners"><table className="table"><tbody>{(banners.data ?? []).map((banner) => <tr key={banner.id}><td>{banner.id}</td><td>{banner.isActive ? <Chip color="success">Active</Chip> : <Chip color="danger">Inactive</Chip>}</td><td>{banner.sortOrder}</td></tr>)}</tbody></table></AdminSection></div></main>;
}

export function StockPageClient() {
  const products = useQuery(trpc.adminCatalog.products.list.queryOptions());
  const movements = useQuery(trpc.orders.adminStockMovements.queryOptions());
  const [form, setForm] = useState({ productId: "", quantityLotsDelta: 0, note: "" });
  const adjustStock = useMutation(trpc.adminCatalog.products.adjustStock.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  return <main className="page"><PageHead title="Stock" description="Adjust stock with a mandatory reason and keep a movement audit trail." /><AdminSection title="Manual adjustment"><div className="form-grid"><EntitySelect label="Product" value={form.productId} onChange={(productId) => setForm({ ...form, productId })} items={(products.data ?? []).map((product) => ({ id: product.id, label: `${product.nameFr} (${product.stockLots} lots)` }))} /><NumberInput label="Delta lots" value={form.quantityLotsDelta} onChange={(quantityLotsDelta) => setForm({ ...form, quantityLotsDelta })} /><Input label="Reason" value={form.note} onValueChange={(note) => setForm({ ...form, note })} /></div><Button isLoading={adjustStock.isPending} onPress={() => adjustStock.mutate(form)}>Save stock adjustment</Button>{adjustStock.error ? <p className="form-error">{adjustStock.error.message}</p> : null}</AdminSection><AdminSection title="Stock movements"><table className="table"><thead><tr><th>Product</th><th>Reason</th><th>Delta</th><th>Order</th></tr></thead><tbody>{(movements.data ?? []).map((movement) => <tr key={movement.id}><td>{movement.product?.nameFr}</td><td>{movement.reason}</td><td>{movement.quantityLotsDelta} lots</td><td>{movement.order?.orderNumber ?? "manual"}</td></tr>)}</tbody></table></AdminSection></main>;
}

export function OrdersPageClient() {
  const [status, setStatus] = useState<(typeof statuses)[number]["key"] | undefined>("to_call");
  const orders = useQuery(trpc.orders.adminList.queryOptions(status ? { status } : undefined));
  return <main className="page"><PageHead title="Orders" description="Call customers, filter operational statuses, and open order detail for BL generation." /><div className="filters"><label className="native-select-label"><span>Status</span><select value={status ?? ""} onChange={(event) => setStatus(event.target.value ? event.target.value as typeof status : undefined)}><option value="">All</option>{statuses.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select></label></div><AdminSection title="Order queue"><SimpleOrderTable orders={orders.data ?? []} /></AdminSection></main>;
}

export function CustomersPageClient() { return <UsersPageClient mode="customers" />; }
export function AdminsPageClient() { return <UsersPageClient mode="admins" />; }

function UsersPageClient({ mode }: { mode: "customers" | "admins" }) {
  const customers = useQuery(trpc.adminUsers.listCustomers.queryOptions());
  const users = useQuery(trpc.adminUsers.list.queryOptions());
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "" });
  const createAdmin = useMutation(trpc.adminUsers.createAdmin.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));

  if (mode === "customers") {
    return <main className="page"><PageHead title="Customers" description="Customer account overview and profile completeness." /><AdminSection title="Customers"><table className="table"><tbody>{(customers.data ?? []).map((customer) => <tr key={customer.id}><td><div className="entity-title"><strong>{customer.profileFullName ?? customer.name}</strong><span>{customer.phoneNumberLocal ?? customer.phoneNumber}</span></div></td><td>{customer.isDisabled ? <Chip color="danger">Disabled</Chip> : <Chip color="success">Active</Chip>}</td></tr>)}</tbody></table></AdminSection></main>;
  }

  const adminUsers = (users.data ?? []).filter((user) => user.role === "admin" || user.role === "owner");

  return <main className="page"><PageHead title="Admins" description="Create and disable back-office accounts." /><AdminSection title="Create admin"><div className="form-grid"><Input label="Name" value={adminForm.name} onValueChange={(name) => setAdminForm({ ...adminForm, name })} /><Input label="Email" value={adminForm.email} onValueChange={(email) => setAdminForm({ ...adminForm, email })} /><Input label="Password" type="password" value={adminForm.password} onValueChange={(password) => setAdminForm({ ...adminForm, password })} /></div><Button isLoading={createAdmin.isPending} onPress={() => createAdmin.mutate(adminForm)}>Create admin</Button></AdminSection><AdminSection title="Admin accounts"><table className="table"><tbody>{adminUsers.map((user) => <tr key={user.id}><td><div className="entity-title"><strong>{user.name}</strong><span>{user.email}</span></div></td><td>{user.isDisabled ? <Chip color="danger">Disabled</Chip> : <Chip color="success">Active</Chip>}</td></tr>)}</tbody></table></AdminSection></main>;
}

export function AnnouncementsPageClient() {
  const announcements = useQuery(trpc.notifications.adminListAnnouncements.queryOptions());
  const [form, setForm] = useState({ title: "", body: "", sendPush: false });
  const createAnnouncement = useMutation(trpc.notifications.adminCreateAnnouncement.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  return <main className="page"><PageHead title="Announcements" description="Publish global announcements and optionally send push notifications." /><AdminSection title="Create announcement"><Input label="Title" value={form.title} onValueChange={(title) => setForm({ ...form, title })} /><TextArea label="Body" value={form.body} onValueChange={(body) => setForm({ ...form, body })} rows={4} /><Switch isSelected={form.sendPush} onValueChange={(sendPush) => setForm({ ...form, sendPush })}>Send push</Switch><Button isLoading={createAnnouncement.isPending} onPress={() => createAnnouncement.mutate(form)}>Publish</Button></AdminSection><AdminSection title="Published"><table className="table"><tbody>{(announcements.data ?? []).map((announcement) => <tr key={announcement.id}><td><strong>{announcement.title}</strong><br /><span className="muted">{announcement.body}</span></td><td>{announcement.sendPush ? "Push" : "In-app"}</td></tr>)}</tbody></table></AdminSection></main>;
}

export function SettingsPageClient() {
  const prefs = useQuery(trpc.notifications.adminListOrderNotificationPreferences.queryOptions());
  return <main className="page"><PageHead title="Settings" description="Production readiness, notification recipients, and local development notes." /><AdminSection title="Order notification recipients"><table className="table"><tbody>{(prefs.data ?? []).map((pref) => <tr key={pref.userId}><td><strong>{pref.name}</strong><br /><span className="muted">{pref.email}</span></td><td>{pref.receivesNewOrderEmail ? "Email on" : "Email off"}</td><td>{pref.receivesNewOrderPush ? "Push on" : "Push off"}</td></tr>)}</tbody></table></AdminSection><AdminSection title="Mobile dev networking"><p className="muted">Run PowerShell as Administrator and configure portproxy from Windows Wi-Fi IP to WSL IP so Expo Go can call the API.</p><pre>netsh interface portproxy add v4tov4 listenaddress=192.168.100.79 listenport=3000 connectaddress=WSL_IP connectport=3000</pre></AdminSection></main>;
}
