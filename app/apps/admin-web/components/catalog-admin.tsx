"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AdminSection, AssetUploadField, Button, Chip, EmptyAdminState, EntitySelect, Input, NumberInput, Switch, Tab, Tabs, TextAreaField } from "@/components/admin-ui";
import { queryClient, trpc } from "@/lib/trpc";

const emptyProduct = {
  nameFr: "",
  nameAr: "",
  unitPrice: "0",
  lotQuantity: 1,
  packagingLabel: "carton",
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

export function CatalogAdminPage() {
  const products = useQuery(trpc.adminCatalog.products.list.queryOptions());
  const brands = useQuery(trpc.adminCatalog.brands.list.queryOptions());
  const categories = useQuery(trpc.adminCatalog.categories.list.queryOptions());
  const banners = useQuery(trpc.adminCatalog.banners.list.queryOptions());
  const homeSettings = useQuery(trpc.adminCatalog.home.settings.queryOptions());
  const stockMovements = useQuery(trpc.orders.adminStockMovements.queryOptions());

  const [productForm, setProductForm] = useState(emptyProduct);
  const [brandForm, setBrandForm] = useState({ name: "", logoAssetId: "", isActive: true, isFeatured: false, sortOrder: 0 });
  const [categoryForm, setCategoryForm] = useState({ nameFr: "", nameAr: "", imageAssetId: "", isActive: true, isFeatured: false, sortOrder: 0 });
  const [bannerForm, setBannerForm] = useState({ imageAssetId: "", isActive: true, sortOrder: 0 });

  const createProduct = useMutation(trpc.adminCatalog.products.create.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const archiveProduct = useMutation(trpc.adminCatalog.products.archive.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const createBrand = useMutation(trpc.adminCatalog.brands.create.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const createCategory = useMutation(trpc.adminCatalog.categories.create.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const createBanner = useMutation(trpc.adminCatalog.banners.create.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const updateHome = useMutation(trpc.adminCatalog.home.updateSettings.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));

  const lowStockProducts = (products.data ?? []).filter((product) => product.lowStockThreshold !== null && product.stockLots <= product.lowStockThreshold);

  return (
    <main className="module-page">
      <section className="module-hero">
        <Chip color="primary" variant="flat">Catalogue operations</Chip>
        <h2>Catalogue, assets, sections, and stock</h2>
        <p>Create products, upload Cloudinary assets, manage Home content, and monitor stock in lots.</p>
      </section>

      <Tabs aria-label="Catalogue admin sections" color="primary">
        <Tab key="products" title="Products">
          <AdminSection title="Create product" description="Products are published immediately and can be archived later.">
            <div className="form-grid">
              <Input label="French name" value={productForm.nameFr} onValueChange={(nameFr) => setProductForm({ ...productForm, nameFr })} />
              <Input label="Arabic name" value={productForm.nameAr} onValueChange={(nameAr) => setProductForm({ ...productForm, nameAr })} />
              <Input label="Unit price" value={productForm.unitPrice} onValueChange={(unitPrice) => setProductForm({ ...productForm, unitPrice })} />
              <NumberInput label="Lot quantity" value={productForm.lotQuantity} onChange={(lotQuantity) => setProductForm({ ...productForm, lotQuantity })} />
              <Input label="Packaging label" value={productForm.packagingLabel} onValueChange={(packagingLabel) => setProductForm({ ...productForm, packagingLabel })} />
              <EntitySelect label="Brand" value={productForm.brandId} onChange={(brandId) => setProductForm({ ...productForm, brandId })} items={(brands.data ?? []).map((brand) => ({ id: brand.id, label: brand.name }))} />
              <Input label="Category IDs" value={productForm.categoryIds.join(",")} onValueChange={(value) => setProductForm({ ...productForm, categoryIds: value.split(",").map((entry) => entry.trim()).filter(Boolean) })} placeholder="cat-1,cat-2" />
              <NumberInput label="Stock lots" value={productForm.stockLots} onChange={(stockLots) => setProductForm({ ...productForm, stockLots })} />
              <NumberInput label="Low stock threshold" value={productForm.lowStockThreshold} onChange={(lowStockThreshold) => setProductForm({ ...productForm, lowStockThreshold })} />
              <Input label="SKU" value={productForm.sku} onValueChange={(sku) => setProductForm({ ...productForm, sku })} />
              <Input label="Badge label" value={productForm.badgeLabel} onValueChange={(badgeLabel) => setProductForm({ ...productForm, badgeLabel })} />
              <Input label="Badge color" value={productForm.badgeColor} onValueChange={(badgeColor) => setProductForm({ ...productForm, badgeColor })} />
              <Input label="Discount lot price" value={productForm.discountLotPrice} onValueChange={(discountLotPrice) => setProductForm({ ...productForm, discountLotPrice })} />
              <NumberInput label="Sort order" value={productForm.sortOrder} onChange={(sortOrder) => setProductForm({ ...productForm, sortOrder })} />
            </div>
            <AssetUploadField kind="product" value={productForm.imageAssetId} onChange={(imageAssetId) => setProductForm({ ...productForm, imageAssetId })} />
            <TextAreaField label="Description" value={productForm.description} onChange={(description) => setProductForm({ ...productForm, description })} />
            <Button
              color="primary"
              isLoading={createProduct.isPending}
              onPress={() => createProduct.mutate({ ...productForm, discountLotPrice: productForm.discountLotPrice || undefined, lowStockThreshold: productForm.lowStockThreshold })}
            >
              Create product
            </Button>
          </AdminSection>

          <AdminSection title="Products" description="Archive keeps product history intact.">
            <div className="admin-table">
              {(products.data ?? []).map((product) => (
                <div className="admin-row" key={product.id}>
                  <div>
                    <strong>{product.nameFr}</strong>
                    <p className="muted">{product.brand?.name ?? "No brand"} · {product.stockLots} lots · {product.lotPrice} DA</p>
                  </div>
                  <div className="row-actions">
                    {product.isArchived ? <Chip color="warning" variant="flat">Archived</Chip> : null}
                    <Button size="sm" variant="flat" onPress={() => archiveProduct.mutate({ id: product.id, isArchived: !product.isArchived })}>
                      {product.isArchived ? "Restore" : "Archive"}
                    </Button>
                  </div>
                </div>
              ))}
              {products.data?.length === 0 ? <EmptyAdminState label="No products yet." /> : null}
            </div>
          </AdminSection>
        </Tab>

        <Tab key="taxonomies" title="Brands & categories">
          <div className="module-grid">
            <AdminSection title="Create brand">
              <Input label="Name" value={brandForm.name} onValueChange={(name) => setBrandForm({ ...brandForm, name })} />
              <AssetUploadField kind="brand" value={brandForm.logoAssetId} onChange={(logoAssetId) => setBrandForm({ ...brandForm, logoAssetId })} />
              <Switch isSelected={brandForm.isActive} onValueChange={(isActive) => setBrandForm({ ...brandForm, isActive })}>Active</Switch>
              <Switch isSelected={brandForm.isFeatured} onValueChange={(isFeatured) => setBrandForm({ ...brandForm, isFeatured })}>Featured</Switch>
              <NumberInput label="Sort order" value={brandForm.sortOrder} onChange={(sortOrder) => setBrandForm({ ...brandForm, sortOrder })} />
              <Button color="primary" onPress={() => createBrand.mutate(brandForm)} isLoading={createBrand.isPending}>Create brand</Button>
            </AdminSection>

            <AdminSection title="Create category">
              <Input label="French name" value={categoryForm.nameFr} onValueChange={(nameFr) => setCategoryForm({ ...categoryForm, nameFr })} />
              <Input label="Arabic name" value={categoryForm.nameAr} onValueChange={(nameAr) => setCategoryForm({ ...categoryForm, nameAr })} />
              <AssetUploadField kind="category" value={categoryForm.imageAssetId} onChange={(imageAssetId) => setCategoryForm({ ...categoryForm, imageAssetId })} />
              <Switch isSelected={categoryForm.isActive} onValueChange={(isActive) => setCategoryForm({ ...categoryForm, isActive })}>Active</Switch>
              <Switch isSelected={categoryForm.isFeatured} onValueChange={(isFeatured) => setCategoryForm({ ...categoryForm, isFeatured })}>Featured</Switch>
              <NumberInput label="Sort order" value={categoryForm.sortOrder} onChange={(sortOrder) => setCategoryForm({ ...categoryForm, sortOrder })} />
              <Button color="primary" onPress={() => createCategory.mutate(categoryForm)} isLoading={createCategory.isPending}>Create category</Button>
            </AdminSection>
          </div>
          <AdminSection title="Current brands and categories">
            <div className="admin-table two-cols">
              <div>{(brands.data ?? []).map((brand) => <p key={brand.id}><strong>{brand.name}</strong> · {brand.isActive ? "active" : "inactive"} · {brand.isFeatured ? "featured" : "standard"}</p>)}</div>
              <div>{(categories.data ?? []).map((category) => <p key={category.id}><strong>{category.nameFr}</strong> · {category.nameAr} · {category.isActive ? "active" : "inactive"}</p>)}</div>
            </div>
          </AdminSection>
        </Tab>

        <Tab key="home" title="Home sections">
          <AdminSection title="Visibility toggles">
            <div className="switch-grid">
              <Switch isSelected={homeSettings.data?.showBanners ?? true} onValueChange={(showBanners) => updateHome.mutate({ showBanners })}>Banners</Switch>
              <Switch isSelected={homeSettings.data?.showFeaturedBrands ?? true} onValueChange={(showFeaturedBrands) => updateHome.mutate({ showFeaturedBrands })}>Featured brands</Switch>
              <Switch isSelected={homeSettings.data?.showFeaturedCategories ?? true} onValueChange={(showFeaturedCategories) => updateHome.mutate({ showFeaturedCategories })}>Featured categories</Switch>
              <Switch isSelected={homeSettings.data?.showFeaturedProducts ?? true} onValueChange={(showFeaturedProducts) => updateHome.mutate({ showFeaturedProducts })}>Featured products</Switch>
            </div>
          </AdminSection>
          <AdminSection title="Create banner" description="Use 16:9 artwork for the best mobile Home result.">
            <AssetUploadField kind="banner" value={bannerForm.imageAssetId} onChange={(imageAssetId) => setBannerForm({ ...bannerForm, imageAssetId })} />
            <Switch isSelected={bannerForm.isActive} onValueChange={(isActive) => setBannerForm({ ...bannerForm, isActive })}>Active</Switch>
            <NumberInput label="Sort order" value={bannerForm.sortOrder} onChange={(sortOrder) => setBannerForm({ ...bannerForm, sortOrder })} />
            <Button color="primary" onPress={() => createBanner.mutate(bannerForm)} isLoading={createBanner.isPending}>Create banner</Button>
            <div className="admin-table">{(banners.data ?? []).map((banner) => <p key={banner.id}>Banner {banner.id} · {banner.isActive ? "active" : "inactive"} · order {banner.sortOrder}</p>)}</div>
          </AdminSection>
        </Tab>

        <Tab key="stock" title="Stock">
          <AdminSection title="Low-stock alerts">
            {lowStockProducts.map((product) => <p key={product.id}><strong>{product.nameFr}</strong> · {product.stockLots} lots · threshold {product.lowStockThreshold}</p>)}
            {lowStockProducts.length === 0 ? <EmptyAdminState label="No low-stock alerts." /> : null}
          </AdminSection>
          <AdminSection title="Stock movement history">
            <div className="admin-table">
              {(stockMovements.data ?? []).map((movement) => (
                <div className="admin-row" key={movement.id}>
                  <div><strong>{movement.product?.nameFr}</strong><p className="muted">{movement.reason} · order {movement.order?.orderNumber ?? "manual"}</p></div>
                  <Chip color={movement.quantityLotsDelta < 0 ? "danger" : "success"} variant="flat">{movement.quantityLotsDelta} lots</Chip>
                </div>
              ))}
            </div>
          </AdminSection>
        </Tab>
      </Tabs>
    </main>
  );
}
