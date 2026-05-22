"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

import { AdminSection, AssetUploadField, Button, Chip, Dialog, EmptyAdminState, EntitySelect, Input, MultiSelect, NumberInput, Switch, TextArea } from "@/components/admin-ui";
import { queryClient, trpc } from "@/lib/trpc";

const statusOptions = [
  { key: "to_call", label: "A appeler" },
  { key: "called", label: "Client appele" },
  { key: "processing", label: "En preparation" },
  { key: "processed", label: "Traitee" },
  { key: "cancelled", label: "Annulee" },
] as const;

const defaultPackagingOptions = ["Carton", "Paquet", "Sac", "Rouleau", "Lot"];

type ProductSummary = {
  id: string;
  nameFr: string;
  nameAr: string;
  unitPrice: string;
  lotQuantity: number;
  packagingLabel: string;
  brand: { id: string; name: string; isActive: boolean } | null;
  categories: Array<{ id: string; nameFr: string }>;
  image: { id: string; url: string } | null;
  stockLots: number;
  lowStockThreshold: number | null;
  sku: string | null;
  description: string | null;
  badgeLabel: string | null;
  badgeColor: string | null;
  discountLotPrice: string | null;
  sortOrder: number;
  isArchived: boolean;
  lotPrice: string;
};

function usePackagingOptions() {
  const [options, setOptions] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultPackagingOptions;
    const stored = window.localStorage.getItem("joumla-packaging-options");
    return stored ? JSON.parse(stored) as string[] : defaultPackagingOptions;
  });

  function save(next: string[]) {
    setOptions(next);
    if (typeof window !== "undefined") window.localStorage.setItem("joumla-packaging-options", JSON.stringify(next));
  }

  return { options, save };
}

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
  return <Chip color={color}>{statusOptions.find((entry) => entry.key === status)?.label ?? status}</Chip>;
}

function ProductForm({ product, onCancel, onSaved }: { product?: ProductSummary | null; onCancel?: () => void; onSaved?: () => void }) {
  const { options: packagingOptions } = usePackagingOptions();
  const brands = useQuery(trpc.adminCatalog.brands.list.queryOptions());
  const categories = useQuery(trpc.adminCatalog.categories.list.queryOptions());
  const createProduct = useMutation(trpc.adminCatalog.products.create.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); onSaved?.(); } }));
  const updateProduct = useMutation(trpc.adminCatalog.products.update.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); onSaved?.(); } }));
  const [form, setForm] = useState({
    nameFr: "",
    nameAr: "",
    unitPrice: "0",
    lotQuantity: 1,
    packagingLabel: packagingOptions[0] ?? "Carton",
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
  });

  useEffect(() => {
    if (!product) return;
    setForm({
      nameFr: product.nameFr,
      nameAr: product.nameAr,
      unitPrice: product.unitPrice,
      lotQuantity: product.lotQuantity,
      packagingLabel: product.packagingLabel,
      brandId: product.brand?.id ?? "",
      categoryIds: product.categories.map((category) => category.id),
      imageAssetId: product.image?.id ?? "",
      stockLots: product.stockLots,
      lowStockThreshold: product.lowStockThreshold ?? 0,
      sku: product.sku ?? "",
      description: product.description ?? "",
      badgeLabel: product.badgeLabel ?? "",
      badgeColor: product.badgeColor ?? "#E74888",
      discountLotPrice: product.discountLotPrice ?? "",
      sortOrder: product.sortOrder,
    });
  }, [product]);

  const payload = {
    nameFr: form.nameFr,
    nameAr: form.nameAr,
    unitPrice: form.unitPrice,
    lotQuantity: form.lotQuantity,
    packagingLabel: form.packagingLabel,
    brandId: form.brandId,
    categoryIds: form.categoryIds,
    imageAssetId: form.imageAssetId || undefined,
    stockLots: form.stockLots,
    lowStockThreshold: form.lowStockThreshold,
    sku: form.sku || undefined,
    description: form.description || undefined,
    badgeLabel: form.badgeLabel || undefined,
    badgeColor: form.badgeColor || undefined,
    discountLotPrice: form.discountLotPrice || undefined,
    sortOrder: form.sortOrder,
  };

  function submit() {
    if (product) {
      updateProduct.mutate({ id: product.id, data: { ...payload, isArchived: product.isArchived } });
      return;
    }
    createProduct.mutate(payload);
  }

  return (
    <AdminSection title={product ? "Modifier le produit" : "Nouveau produit"} description="Formulaire allege : les champs rarement modifies sont ranges dans les details avances.">
      <div className="form-grid">
        <Input label="Nom en francais" value={form.nameFr} onValueChange={(nameFr) => setForm({ ...form, nameFr })} />
        <Input label="Nom en arabe" value={form.nameAr} onValueChange={(nameAr) => setForm({ ...form, nameAr })} />
        <Input label="Prix unitaire (DA)" value={form.unitPrice} onValueChange={(unitPrice) => setForm({ ...form, unitPrice })} />
        <NumberInput label="Pieces par lot" value={form.lotQuantity} onChange={(lotQuantity) => setForm({ ...form, lotQuantity })} />
        <label className="native-select-label">
          <span>Conditionnement</span>
          <select value={form.packagingLabel} onChange={(event) => setForm({ ...form, packagingLabel: event.target.value })}>
            {[...new Set([...packagingOptions, form.packagingLabel].filter(Boolean))].map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <NumberInput label="Stock disponible (lots)" value={form.stockLots} onChange={(stockLots) => setForm({ ...form, stockLots })} />
        <EntitySelect label="Marque" value={form.brandId} onChange={(brandId) => setForm({ ...form, brandId })} items={(brands.data ?? []).map((brand) => ({ id: brand.id, label: brand.name }))} />
      </div>
      <MultiSelect label="Categories" values={form.categoryIds} onChange={(categoryIds) => setForm({ ...form, categoryIds })} items={(categories.data ?? []).map((category) => ({ id: category.id, label: category.nameFr }))} />
      <AssetUploadField kind="product" label="Photo produit" value={form.imageAssetId} onChange={(imageAssetId) => setForm({ ...form, imageAssetId })} />
      <TextArea label="Description" value={form.description} onValueChange={(description) => setForm({ ...form, description })} rows={3} />
      <details className="advanced-box">
        <summary>Details avances</summary>
        <div className="form-grid">
          <Input label="Reference interne" value={form.sku} onValueChange={(sku) => setForm({ ...form, sku })} placeholder="Anciennement SKU" />
          <NumberInput label="Alerte stock minimum" value={form.lowStockThreshold} onChange={(lowStockThreshold) => setForm({ ...form, lowStockThreshold })} />
          <Input label="Badge produit" value={form.badgeLabel} onValueChange={(badgeLabel) => setForm({ ...form, badgeLabel })} />
          <Input label="Prix lot promotionnel" value={form.discountLotPrice} onValueChange={(discountLotPrice) => setForm({ ...form, discountLotPrice })} />
          <NumberInput label="Ordre d'affichage" value={form.sortOrder} onChange={(sortOrder) => setForm({ ...form, sortOrder })} />
        </div>
      </details>
      <div className="button-row">
        <Button isLoading={createProduct.isPending || updateProduct.isPending} onPress={submit}>{product ? "Enregistrer" : "Creer le produit"}</Button>
        {product ? <Button variant="flat" onPress={onCancel}>Annuler</Button> : null}
      </div>
      {createProduct.error ? <p className="form-error">{createProduct.error.message}</p> : null}
      {updateProduct.error ? <p className="form-error">{updateProduct.error.message}</p> : null}
    </AdminSection>
  );
}

function SimpleOrderTable({ orders }: { orders: Array<{ id: string; orderNumber: string; customerFullNameSnapshot: string; customerPhoneLocalSnapshot?: string | null; customerPhoneSnapshot?: string | null; status: string; totalAmountSnapshot: string }> }) {
  if (orders.length === 0) return <EmptyAdminState label="Aucune commande." />;
  return <table className="table"><thead><tr><th>Numero</th><th>Client</th><th>Statut</th><th>Total</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.orderNumber}</strong></td><td><div className="entity-title"><strong>{order.customerFullNameSnapshot}</strong><span>{order.customerPhoneLocalSnapshot ?? order.customerPhoneSnapshot}</span></div></td><td><StatusChip status={order.status} /></td><td>{order.totalAmountSnapshot} DA</td></tr>)}</tbody></table>;
}

export function DashboardPageClient() {
  const orders = useQuery(trpc.orders.adminList.queryOptions({ status: "to_call" }));
  const products = useQuery(trpc.adminCatalog.products.list.queryOptions());
  const stockMovements = useQuery(trpc.orders.adminStockMovements.queryOptions());
  const lowStock = (products.data ?? []).filter((product) => product.lowStockThreshold !== null && product.stockLots <= product.lowStockThreshold);
  const incomplete = (products.data ?? []).filter((product) => !product.image || product.stockLots === 0 || !product.description || product.categories.length === 0 || product.brand?.isActive === false);

  return (
    <main className="page">
      <PageHead title="Tableau de bord" description="Les priorites du jour : appels clients, stock faible et catalogue a completer." />
      <div className="grid-3">
        <div className="card metric"><span>Commandes a appeler</span><strong>{orders.data?.length ?? 0}</strong></div>
        <div className="card metric"><span>Stock faible</span><strong>{lowStock.length}</strong></div>
        <div className="card metric"><span>Produits incomplets</span><strong>{incomplete.length}</strong></div>
      </div>
      <div className="grid-2">
        <AdminSection title="Commandes a appeler"><SimpleOrderTable orders={orders.data ?? []} /></AdminSection>
        <AdminSection title="Alertes stock">
          {lowStock.map((product) => <p key={product.id}><strong>{product.nameFr}</strong> · {product.stockLots} lots · alerte a {product.lowStockThreshold}</p>)}
          {lowStock.length === 0 ? <EmptyAdminState label="Aucune alerte stock." /> : null}
        </AdminSection>
      </div>
      <AdminSection title="Derniers mouvements de stock">
        <table className="table"><tbody>{(stockMovements.data ?? []).slice(0, 8).map((movement) => <tr key={movement.id}><td>{movement.product?.nameFr}</td><td>{movement.reason === "manual_adjustment" ? "Ajustement manuel" : movement.reason}</td><td>{movement.quantityLotsDelta} lots</td></tr>)}</tbody></table>
      </AdminSection>
    </main>
  );
}

export function ProductsPageClient() {
  const products = useQuery(trpc.adminCatalog.products.list.queryOptions());
  const archiveProduct = useMutation(trpc.adminCatalog.products.archive.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const [editingProduct, setEditingProduct] = useState<ProductSummary | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  return (
    <main className="page">
      <PageHead title="Produits" description="Visualisez, creez et modifiez tous les produits du catalogue." action={<Button onPress={() => setIsCreateOpen(true)}>Nouveau produit</Button>} />
      <Dialog title="Nouveau produit" description="Creation complete du produit." isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <ProductForm key="new" onSaved={() => setIsCreateOpen(false)} />
      </Dialog>
      <Dialog title="Modifier le produit" description={editingProduct?.nameFr} isOpen={!!editingProduct} onClose={() => setEditingProduct(null)}>
        <ProductForm key={editingProduct?.id ?? "edit"} product={editingProduct} onCancel={() => setEditingProduct(null)} onSaved={() => setEditingProduct(null)} />
      </Dialog>
      <AdminSection title="Tous les produits">
        <table className="table"><thead><tr><th>Produit</th><th>Marque</th><th>Categories</th><th>Stock</th><th>Lot</th><th></th></tr></thead><tbody>{((products.data ?? []) as ProductSummary[]).map((product) => <tr key={product.id}><td><div className="entity-title"><strong>{product.nameFr}</strong><span>{product.nameAr}</span></div>{product.isArchived ? <Chip color="warning">Archive</Chip> : null}</td><td>{product.brand?.name ?? "Sans marque"}</td><td>{product.categories.map((category) => category.nameFr).join(", ") || "-"}</td><td>{product.stockLots} lots</td><td>{product.lotPrice} DA</td><td><div className="button-row"><Button size="sm" variant="flat" onPress={() => setEditingProduct(product)}>Modifier</Button><Button size="sm" variant="flat" onPress={() => archiveProduct.mutate({ id: product.id, isArchived: !product.isArchived })}>{product.isArchived ? "Restaurer" : "Archiver"}</Button></div></td></tr>)}</tbody></table>
      </AdminSection>
    </main>
  );
}

export function CategoriesPageClient() {
  const categories = useQuery(trpc.adminCatalog.categories.list.queryOptions());
  const [editing, setEditing] = useState<null | { id?: string; nameFr: string; nameAr: string; imageAssetId: string; isActive: boolean; isFeatured: boolean; sortOrder: number }>(null);
  const createCategory = useMutation(trpc.adminCatalog.categories.create.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setEditing(null); } }));
  const updateCategory = useMutation(trpc.adminCatalog.categories.update.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setEditing(null); } }));
  const form = editing;

  function submitCategory() {
    if (!form) return;
    const data = { nameFr: form.nameFr, nameAr: form.nameAr, imageAssetId: form.imageAssetId || undefined, isActive: form.isActive, isFeatured: form.isFeatured, sortOrder: form.sortOrder };
    if (form.id) updateCategory.mutate({ id: form.id, data });
    else createCategory.mutate(data);
  }

  return <main className="page"><PageHead title="Categories" description="Les categories actives apparaissent dans l'app mobile meme avant d'avoir des produits." action={<Button onPress={() => setEditing({ nameFr: "", nameAr: "", imageAssetId: "", isActive: true, isFeatured: true, sortOrder: 0 })}>Nouvelle categorie</Button>} /><Dialog title={form?.id ? "Modifier la categorie" : "Nouvelle categorie"} isOpen={!!form} onClose={() => setEditing(null)}><div className="form-stack">{form ? <><Input label="Nom francais" value={form.nameFr} onValueChange={(nameFr) => setEditing({ ...form, nameFr })} /><Input label="Nom arabe" value={form.nameAr} onValueChange={(nameAr) => setEditing({ ...form, nameAr })} /><AssetUploadField kind="category" label="Image categorie" value={form.imageAssetId} onChange={(imageAssetId) => setEditing({ ...form, imageAssetId })} /><Switch isSelected={form.isActive} onValueChange={(isActive) => setEditing({ ...form, isActive })}>Active</Switch><Switch isSelected={form.isFeatured} onValueChange={(isFeatured) => setEditing({ ...form, isFeatured })}>Afficher a l'accueil</Switch><NumberInput label="Ordre d'affichage" value={form.sortOrder} onChange={(sortOrder) => setEditing({ ...form, sortOrder })} /><Button isLoading={createCategory.isPending || updateCategory.isPending} onPress={submitCategory}>Enregistrer</Button></> : null}</div></Dialog><AdminSection title="Categories"><table className="table"><tbody>{(categories.data ?? []).map((item) => <tr key={item.id}><td><div className="entity-title"><strong>{item.nameFr}</strong><span>{item.nameAr}</span></div></td><td>{item.isActive ? <Chip color="success">Actif</Chip> : <Chip color="danger">Masque</Chip>}</td><td>{item.isFeatured ? <Chip>Accueil</Chip> : null}</td><td>{item.sortOrder}</td><td><Button size="sm" variant="flat" onPress={() => setEditing({ id: item.id, nameFr: item.nameFr, nameAr: item.nameAr, imageAssetId: item.image?.id ?? "", isActive: item.isActive, isFeatured: item.isFeatured, sortOrder: item.sortOrder })}>Modifier</Button></td></tr>)}</tbody></table>{categories.data?.length === 0 ? <EmptyAdminState label="Aucune categorie." /> : null}</AdminSection></main>;
}

export function BrandsPageClient() {
  const brands = useQuery(trpc.adminCatalog.brands.list.queryOptions());
  const [editing, setEditing] = useState<null | { id?: string; name: string; logoAssetId: string; isActive: boolean; isFeatured: boolean; sortOrder: number }>(null);
  const createBrand = useMutation(trpc.adminCatalog.brands.create.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setEditing(null); } }));
  const updateBrand = useMutation(trpc.adminCatalog.brands.update.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setEditing(null); } }));
  const form = editing;
  function submitBrand() { if (!form) return; const data = { name: form.name, logoAssetId: form.logoAssetId || undefined, isActive: form.isActive, isFeatured: form.isFeatured, sortOrder: form.sortOrder }; if (form.id) updateBrand.mutate({ id: form.id, data }); else createBrand.mutate(data); }
  return <main className="page"><PageHead title="Marques" description="Gerez les marques visibles dans le catalogue et l'accueil." action={<Button onPress={() => setEditing({ name: "", logoAssetId: "", isActive: true, isFeatured: true, sortOrder: 0 })}>Nouvelle marque</Button>} /><Dialog title={form?.id ? "Modifier la marque" : "Nouvelle marque"} isOpen={!!form} onClose={() => setEditing(null)}><div className="form-stack">{form ? <><Input label="Nom" value={form.name} onValueChange={(name) => setEditing({ ...form, name })} /><AssetUploadField kind="brand" label="Logo marque" value={form.logoAssetId} onChange={(logoAssetId) => setEditing({ ...form, logoAssetId })} /><Switch isSelected={form.isActive} onValueChange={(isActive) => setEditing({ ...form, isActive })}>Active</Switch><Switch isSelected={form.isFeatured} onValueChange={(isFeatured) => setEditing({ ...form, isFeatured })}>Afficher a l'accueil</Switch><NumberInput label="Ordre d'affichage" value={form.sortOrder} onChange={(sortOrder) => setEditing({ ...form, sortOrder })} /><Button isLoading={createBrand.isPending || updateBrand.isPending} onPress={submitBrand}>Enregistrer</Button></> : null}</div></Dialog><AdminSection title="Marques"><table className="table"><tbody>{(brands.data ?? []).map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.isActive ? <Chip color="success">Actif</Chip> : <Chip color="danger">Masque</Chip>}</td><td>{item.isFeatured ? <Chip>Accueil</Chip> : null}</td><td>{item.sortOrder}</td><td><Button size="sm" variant="flat" onPress={() => setEditing({ id: item.id, name: item.name, logoAssetId: item.logo?.id ?? "", isActive: item.isActive, isFeatured: item.isFeatured, sortOrder: item.sortOrder })}>Modifier</Button></td></tr>)}</tbody></table>{brands.data?.length === 0 ? <EmptyAdminState label="Aucune marque." /> : null}</AdminSection></main>;
}

export function BannersPageClient() {
  const banners = useQuery(trpc.adminCatalog.banners.list.queryOptions());
  const [editing, setEditing] = useState<null | { id?: string; imageAssetId: string; isActive: boolean; sortOrder: number }>(null);
  const createBanner = useMutation(trpc.adminCatalog.banners.create.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setEditing(null); } }));
  const updateBanner = useMutation(trpc.adminCatalog.banners.update.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setEditing(null); } }));
  const form = editing;
  function submitBanner() { if (!form) return; const data = { imageAssetId: form.imageAssetId, isActive: form.isActive, sortOrder: form.sortOrder }; if (form.id) updateBanner.mutate({ id: form.id, data }); else createBanner.mutate(data); }
  return <main className="page"><PageHead title="Bannieres" description="Visuels de l'accueil mobile, format large recommande." action={<Button onPress={() => setEditing({ imageAssetId: "", isActive: true, sortOrder: 0 })}>Nouvelle banniere</Button>} /><Dialog title={form?.id ? "Modifier la banniere" : "Nouvelle banniere"} isOpen={!!form} onClose={() => setEditing(null)}><div className="form-stack">{form ? <><AssetUploadField kind="banner" label="Image banniere" value={form.imageAssetId} onChange={(imageAssetId) => setEditing({ ...form, imageAssetId })} /><Switch isSelected={form.isActive} onValueChange={(isActive) => setEditing({ ...form, isActive })}>Active</Switch><NumberInput label="Ordre d'affichage" value={form.sortOrder} onChange={(sortOrder) => setEditing({ ...form, sortOrder })} /><Button isLoading={createBanner.isPending || updateBanner.isPending} onPress={submitBanner}>Enregistrer</Button></> : null}</div></Dialog><AdminSection title="Bannieres"><table className="table"><tbody>{(banners.data ?? []).map((banner) => <tr key={banner.id}><td>{banner.id}</td><td>{banner.isActive ? <Chip color="success">Active</Chip> : <Chip color="danger">Masquee</Chip>}</td><td>{banner.sortOrder}</td><td><Button size="sm" variant="flat" onPress={() => setEditing({ id: banner.id, imageAssetId: banner.image?.id ?? "", isActive: banner.isActive, sortOrder: banner.sortOrder })}>Modifier</Button></td></tr>)}</tbody></table></AdminSection></main>;
}

export function StockPageClient() {
  const products = useQuery(trpc.adminCatalog.products.list.queryOptions());
  const movements = useQuery(trpc.orders.adminStockMovements.queryOptions());
  const [form, setForm] = useState<null | { productId: string; productName: string; direction: "add" | "remove"; quantity: number; note: string }>(null);
  const adjustStock = useMutation(trpc.adminCatalog.products.adjustStock.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));

  function submitStock() {
    if (!form) return;
    const delta = form.direction === "add" ? Math.abs(form.quantity) : -Math.abs(form.quantity);
    adjustStock.mutate({ productId: form.productId, quantityLotsDelta: delta, note: form.note || (form.direction === "add" ? "Ajout stock" : "Sortie stock") }, { onSuccess: () => setForm(null) });
  }

  return <main className="page"><PageHead title="Stock" description="Visualisez chaque produit, ajoutez ou diminuez le stock, puis suivez tout l'historique." /><Dialog title={form?.direction === "add" ? "Ajouter du stock" : "Diminuer le stock"} description={form?.productName} isOpen={!!form} onClose={() => setForm(null)}><div className="form-stack">{form ? <><NumberInput label="Nombre de lots" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} /><Input label="Raison" value={form.note} onValueChange={(note) => setForm({ ...form, note })} placeholder={form.direction === "add" ? "Reception fournisseur" : "Casse, correction, sortie..."} /><Button isLoading={adjustStock.isPending} onPress={submitStock}>Enregistrer</Button>{adjustStock.error ? <p className="form-error">{adjustStock.error.message}</p> : null}</> : null}</div></Dialog><AdminSection title="Produits en stock"><table className="table"><thead><tr><th>Produit</th><th>Stock actuel</th><th>Alerte</th><th>Action</th></tr></thead><tbody>{(products.data ?? []).map((product) => <tr key={product.id}><td><div className="entity-title"><strong>{product.nameFr}</strong><span>{product.brand?.name ?? "Sans marque"}</span></div></td><td>{product.stockLots} lots</td><td>{product.lowStockThreshold ?? "-"}</td><td><div className="stock-cell"><Button size="sm" onPress={() => setForm({ productId: product.id, productName: product.nameFr, direction: "add", quantity: 1, note: "" })}>Ajouter</Button><Button size="sm" variant="flat" onPress={() => setForm({ productId: product.id, productName: product.nameFr, direction: "remove", quantity: 1, note: "" })}>Diminuer</Button></div></td></tr>)}</tbody></table></AdminSection><AdminSection title="Historique des mouvements"><table className="table"><thead><tr><th>Date</th><th>Produit</th><th>Mouvement</th><th>Origine</th><th>Admin</th></tr></thead><tbody>{(movements.data ?? []).map((movement) => <tr key={movement.id}><td>{new Date(movement.createdAt).toLocaleString("fr-FR")}</td><td>{movement.product?.nameFr}</td><td>{movement.quantityLotsDelta > 0 ? "+" : ""}{movement.quantityLotsDelta} lots</td><td>{movement.order?.orderNumber ?? (movement.reason === "manual_adjustment" ? "Ajustement manuel" : movement.reason)}</td><td>{movement.adminUser?.name ?? "Systeme"}</td></tr>)}</tbody></table></AdminSection></main>;
}

export function OrdersPageClient() {
  const [status, setStatus] = useState<(typeof statusOptions)[number]["key"] | undefined>("to_call");
  const orders = useQuery(trpc.orders.adminList.queryOptions(status ? { status } : undefined));
  return <main className="page"><PageHead title="Commandes" description="Les numeros de commandes sont visibles directement pour faciliter les appels." /><div className="filters"><label className="native-select-label"><span>Statut</span><select value={status ?? ""} onChange={(event) => setStatus(event.target.value ? event.target.value as typeof status : undefined)}><option value="">Tous</option>{statusOptions.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select></label></div><AdminSection title="Liste des commandes"><SimpleOrderTable orders={orders.data ?? []} /></AdminSection></main>;
}

export function CustomersPageClient() { return <UsersPageClient mode="customers" />; }
export function AdminsPageClient() { return <UsersPageClient mode="admins" />; }

function UsersPageClient({ mode }: { mode: "customers" | "admins" }) {
  const customers = useQuery(trpc.adminUsers.listCustomers.queryOptions());
  const users = useQuery(trpc.adminUsers.list.queryOptions());
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "" });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({ fullName: "", phoneNumber: "", wilayaId: "", communeId: "", streetAddress: "" });
  const createAdmin = useMutation(trpc.adminUsers.createAdmin.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const disableUser = useMutation(trpc.adminUsers.disableUser.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const enableUser = useMutation(trpc.adminUsers.enableUser.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const updatePhone = useMutation(trpc.adminUsers.updateClientPhone.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const updateCustomerProfile = useMutation(trpc.adminUsers.updateCustomerProfile.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const customerDetail = useQuery({ ...trpc.adminUsers.customerDetail.queryOptions({ userId: selectedCustomerId ?? "missing" }), enabled: !!selectedCustomerId });
  const wilayas = useQuery(trpc.locations.wilayas.queryOptions());
  const communes = useQuery({ ...trpc.locations.communesByWilaya.queryOptions({ wilayaId: customerForm.wilayaId || "missing" }), enabled: !!customerForm.wilayaId });

  useEffect(() => {
    if (!customerDetail.data) return;
    const detail = customerDetail.data;
    setCustomerForm({
      fullName: detail.profile?.fullName ?? detail.user.name,
      phoneNumber: detail.user.phoneNumberLocal ?? detail.user.phoneNumber ?? "",
      wilayaId: detail.profile?.wilayaId ?? "",
      communeId: detail.profile?.communeId ?? "",
      streetAddress: detail.profile?.streetAddress ?? "",
    });
  }, [customerDetail.data]);

  if (mode === "customers") {
    const selectedCustomer = customers.data?.find((customer) => customer.id === selectedCustomerId);
    return <main className="page"><PageHead title="Clients" description="Suivi des comptes clients, blocage et modification du profil." /><Dialog title="Fiche client" description={selectedCustomer?.profileFullName ?? selectedCustomer?.name} isOpen={!!selectedCustomerId} onClose={() => setSelectedCustomerId(null)}><div className="form-stack"><div className="form-grid"><Input label="Nom complet" value={customerForm.fullName} onValueChange={(fullName) => setCustomerForm({ ...customerForm, fullName })} /><Input label="Telephone" value={customerForm.phoneNumber} onValueChange={(phoneNumber) => setCustomerForm({ ...customerForm, phoneNumber })} /><EntitySelect label="Wilaya" value={customerForm.wilayaId} onChange={(wilayaId) => setCustomerForm({ ...customerForm, wilayaId, communeId: "" })} items={(wilayas.data ?? []).map((wilaya) => ({ id: wilaya.id, label: `${wilaya.code} - ${wilaya.nameFr}` }))} /><EntitySelect label="Commune" value={customerForm.communeId} onChange={(communeId) => setCustomerForm({ ...customerForm, communeId })} items={(communes.data ?? []).map((commune) => ({ id: commune.id, label: commune.nameFr }))} /></div><TextArea label="Adresse" value={customerForm.streetAddress} onValueChange={(streetAddress) => setCustomerForm({ ...customerForm, streetAddress })} /><div className="button-row"><Button isLoading={updateCustomerProfile.isPending || updatePhone.isPending} onPress={() => { if (!selectedCustomerId) return; updateCustomerProfile.mutate({ userId: selectedCustomerId, fullName: customerForm.fullName, wilayaId: customerForm.wilayaId, communeId: customerForm.communeId, streetAddress: customerForm.streetAddress }); updatePhone.mutate({ userId: selectedCustomerId, phoneNumber: customerForm.phoneNumber }); }}>Enregistrer</Button>{selectedCustomer ? <Button color="danger" variant="flat" isLoading={disableUser.isPending || enableUser.isPending} onPress={() => selectedCustomer.isDisabled ? enableUser.mutate({ userId: selectedCustomer.id }) : disableUser.mutate({ userId: selectedCustomer.id })}>{selectedCustomer.isDisabled ? "Reactiver le compte" : "Bloquer le compte"}</Button> : null}</div>{customerDetail.data?.orders?.length ? <div className="inline-card"><strong>Commandes client</strong><table className="table"><tbody>{customerDetail.data.orders.slice(0, 8).map((order) => <tr key={order.id}><td>{order.orderNumber}</td><td>{order.status}</td><td>{order.totalAmountSnapshot} DA</td></tr>)}</tbody></table></div> : null}</div></Dialog><AdminSection title="Clients"><table className="table"><thead><tr><th>Client</th><th>Adresse</th><th>Statut</th><th></th></tr></thead><tbody>{(customers.data ?? []).map((customer) => <tr key={customer.id}><td><div className="entity-title"><strong>{customer.profileFullName ?? customer.name}</strong><span>{customer.phoneNumberLocal ?? customer.phoneNumber}</span></div></td><td>{customer.streetAddress ?? "Adresse incomplete"}</td><td>{customer.isDisabled ? <Chip color="danger">Bloque</Chip> : <Chip color="success">Actif</Chip>}</td><td><div className="button-row"><Button size="sm" variant="flat" onPress={() => setSelectedCustomerId(customer.id)}>Modifier</Button><Button size="sm" color="danger" variant="flat" isLoading={disableUser.isPending || enableUser.isPending} onPress={() => customer.isDisabled ? enableUser.mutate({ userId: customer.id }) : disableUser.mutate({ userId: customer.id })}>{customer.isDisabled ? "Reactiver" : "Bloquer"}</Button></div></td></tr>)}</tbody></table></AdminSection></main>;
  }

  const adminUsers = (users.data ?? []).filter((user) => user.role === "admin" || user.role === "owner");
  return <main className="page"><PageHead title="Admins" description="Creation et suivi des comptes back-office." /><AdminSection title="Nouvel admin"><div className="form-grid"><Input label="Nom" value={adminForm.name} onValueChange={(name) => setAdminForm({ ...adminForm, name })} /><Input label="Email" value={adminForm.email} onValueChange={(email) => setAdminForm({ ...adminForm, email })} /><Input label="Mot de passe" type="password" value={adminForm.password} onValueChange={(password) => setAdminForm({ ...adminForm, password })} /></div><Button isLoading={createAdmin.isPending} onPress={() => createAdmin.mutate(adminForm)}>Creer l'admin</Button></AdminSection><AdminSection title="Comptes admin"><table className="table"><tbody>{adminUsers.map((user) => <tr key={user.id}><td><div className="entity-title"><strong>{user.name}</strong><span>{user.email}</span></div></td><td>{user.isDisabled ? <Chip color="danger">Desactive</Chip> : <Chip color="success">Actif</Chip>}</td></tr>)}</tbody></table></AdminSection></main>;
}

export function AnnouncementsPageClient() {
  const announcements = useQuery(trpc.notifications.adminListAnnouncements.queryOptions());
  const [form, setForm] = useState({ title: "", body: "", sendPush: false });
  const createAnnouncement = useMutation(trpc.notifications.adminCreateAnnouncement.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  return <main className="page"><PageHead title="Annonces" description="Publiez des messages visibles par les clients." /><AdminSection title="Nouvelle annonce"><Input label="Titre" value={form.title} onValueChange={(title) => setForm({ ...form, title })} /><TextArea label="Message" value={form.body} onValueChange={(body) => setForm({ ...form, body })} rows={4} /><Switch isSelected={form.sendPush} onValueChange={(sendPush) => setForm({ ...form, sendPush })}>Envoyer une notification push</Switch><Button isLoading={createAnnouncement.isPending} onPress={() => createAnnouncement.mutate(form)}>Publier</Button></AdminSection><AdminSection title="Annonces publiees"><table className="table"><tbody>{(announcements.data ?? []).map((announcement) => <tr key={announcement.id}><td><strong>{announcement.title}</strong><br /><span className="muted">{announcement.body}</span></td><td>{announcement.sendPush ? "Push" : "Application"}</td></tr>)}</tbody></table></AdminSection></main>;
}

export function SettingsPageClient() {
  const prefs = useQuery(trpc.notifications.adminListOrderNotificationPreferences.queryOptions());
  const { options, save } = usePackagingOptions();
  const [newOption, setNewOption] = useState("");
  const cleanedOptions = useMemo(() => [...new Set(options.map((option) => option.trim()).filter(Boolean))], [options]);

  function addOption() {
    const value = newOption.trim();
    if (!value) return;
    save([...cleanedOptions, value]);
    setNewOption("");
  }

  function removeOption(optionToRemove: string) {
    save(cleanedOptions.filter((option) => option !== optionToRemove));
  }

  return (
    <main className="page">
      <PageHead title="Parametres" description="Reglages transverses pour simplifier les formulaires et controler les notifications admin." />
      <div className="settings-grid">
        <div className="settings-card">
          <strong>Conditionnements produits</strong>
          <p className="muted">Liste utilisee dans le formulaire produit. Ajoutez ici les valeurs recurrentes comme carton, paquet, sac ou rouleau.</p>
        </div>
        <div className="settings-card">
          <strong>Notifications commandes</strong>
          <p className="muted">Lecture seule pour l'instant : elle permet de verifier quels admins recevront les alertes email et push.</p>
        </div>
      </div>
      <AdminSection title="Conditionnements produits" description="Ces options apparaissent dans le champ Conditionnement lors de la creation ou modification d'un produit.">
        <div className="settings-list">
          {cleanedOptions.map((option) => (
            <div className="settings-row" key={option}>
              <div className="settings-row-main">
                <strong>{option}</strong>
                <span>Disponible dans le formulaire produit</span>
              </div>
              <Button size="sm" variant="flat" color="danger" onPress={() => removeOption(option)}>Retirer</Button>
            </div>
          ))}
          {cleanedOptions.length === 0 ? <EmptyAdminState label="Aucun conditionnement configure." /> : null}
        </div>
        <div className="form-grid">
          <Input label="Nouveau conditionnement" value={newOption} onValueChange={setNewOption} placeholder="Ex: Boite" onKeyDown={(event) => { if (event.key === "Enter") addOption(); }} />
          <div className="admin-field"><span>Action</span><Button onPress={addOption}>Ajouter le conditionnement</Button></div>
        </div>
      </AdminSection>
      <AdminSection title="Notifications nouvelles commandes" description="Verifiez rapidement les admins qui recevront les alertes operationnelles.">
        <div className="settings-list">
          {(prefs.data ?? []).map((pref) => (
            <div className="settings-row" key={pref.userId}>
              <div className="settings-row-main">
                <strong>{pref.name}</strong>
                <span>{pref.email}</span>
              </div>
              <div className="setting-status">
                <Chip color={pref.receivesNewOrderEmail ? "success" : "danger"}>{pref.receivesNewOrderEmail ? "Email actif" : "Email inactif"}</Chip>
                <Chip color={pref.receivesNewOrderPush ? "success" : "danger"}>{pref.receivesNewOrderPush ? "Push actif" : "Push inactif"}</Chip>
              </div>
            </div>
          ))}
          {prefs.data?.length === 0 ? <EmptyAdminState label="Aucun admin configure pour les notifications." /> : null}
        </div>
      </AdminSection>
      <AdminSection title="Connexion mobile" description="Aide rapide lorsque l'application mobile ne voit pas le backend local.">
        <div className="settings-card">
          <strong>Adresse backend actuelle</strong>
          <p className="muted">Le mobile doit utiliser l'adresse IP du reseau actif du PC, pas une ancienne IP Wi-Fi. En partage 4G, cette IP change souvent.</p>
          <p><code>EXPO_PUBLIC_SERVER_URL</code> dans <code>apps/native/.env</code></p>
        </div>
      </AdminSection>
    </main>
  );
}
