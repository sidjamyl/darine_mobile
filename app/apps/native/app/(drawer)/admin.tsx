import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import { Button, Spinner, useToast } from "heroui-native";
import type React from "react";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { formatDa } from "@/components/catalog/catalog-format";
import { Container } from "@/components/container";
import { getOrderStatusLabel } from "@/components/order/order-format";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { ShellEmptyState } from "@/components/shell-empty-state";
import { useAppTheme } from "@/contexts/app-theme-context";
import { pickAndUploadAdminAsset } from "@/lib/admin-asset-upload";
import { joumlaColors } from "@/lib/app-shell";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";

const tabs = ["orders", "stock", "catalog", "users", "announcements"] as const;
const statuses = ["to_call", "called", "processing", "processed", "cancelled"] as const;

const labels = {
  orders: "Orders",
  stock: "Stock",
  catalog: "Catalog",
  users: "Users",
  announcements: "Announcements",
};

function AdminCard({ children }: { children: React.ReactNode }) {
  const { isDark } = useAppTheme();
  return (
    <View style={{ backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: isDark ? "#27334A" : joumlaColors.line, padding: 16, gap: 12 }}>
      {children}
    </View>
  );
}

function Field({ placeholder, value, onChangeText }: { placeholder: string; value: string; onChangeText: (value: string) => void }) {
  const { isDark, isRtl } = useAppTheme();
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={joumlaColors.slate}
      value={value}
      onChangeText={onChangeText}
      style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, textAlign: isRtl ? "right" : "left", borderRadius: 16, borderWidth: 1, borderColor: isDark ? "#27334A" : joumlaColors.line, paddingHorizontal: 12, paddingVertical: 10 }}
    />
  );
}

export default function AdminScreen() {
  const { t, language, isDark, isRtl } = useAppTheme();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("orders");
  const [orderStatus, setOrderStatus] = useState<(typeof statuses)[number] | undefined>();
  const [bl, setBl] = useState({ oldBalance: "0", paymentAmount: "0", newBalance: "0" });
  const [productForm, setProductForm] = useState({ nameFr: "", nameAr: "", unitPrice: "0", lotQuantity: "1", packagingLabel: "carton", brandId: "", categoryIds: "", imageAssetId: "", stockLots: "0", lowStockThreshold: "0" });
  const [brandForm, setBrandForm] = useState({ name: "", logoAssetId: "" });
  const [categoryForm, setCategoryForm] = useState({ nameFr: "", nameAr: "", imageAssetId: "" });
  const [announcement, setAnnouncement] = useState({ title: "", body: "", sendPush: false });

  const adminProbe = useQuery({ ...trpc.adminUsers.list.queryOptions(), retry: false });
  const orders = useQuery({ ...trpc.orders.adminList.queryOptions(orderStatus ? { status: orderStatus } : undefined), enabled: adminProbe.isSuccess });
  const products = useQuery({ ...trpc.adminCatalog.products.list.queryOptions(), enabled: adminProbe.isSuccess });
  const brands = useQuery({ ...trpc.adminCatalog.brands.list.queryOptions(), enabled: adminProbe.isSuccess });
  const categories = useQuery({ ...trpc.adminCatalog.categories.list.queryOptions(), enabled: adminProbe.isSuccess });
  const stockMovements = useQuery({ ...trpc.orders.adminStockMovements.queryOptions(), enabled: adminProbe.isSuccess });
  const users = useQuery({ ...trpc.adminUsers.list.queryOptions(), enabled: adminProbe.isSuccess });
  const announcements = useQuery({ ...trpc.notifications.adminListAnnouncements.queryOptions(), enabled: adminProbe.isSuccess });

  const updateStatus = useMutation(trpc.orders.adminUpdateStatus.mutationOptions({ onSuccess: () => queryClient.invalidateQueries(), onError: (error) => toast.show({ variant: "danger", label: error.message }) }));
  const createProduct = useMutation(trpc.adminCatalog.products.create.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const createBrand = useMutation(trpc.adminCatalog.brands.create.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const createCategory = useMutation(trpc.adminCatalog.categories.create.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const disableUser = useMutation(trpc.adminUsers.disableUser.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const createAnnouncement = useMutation(trpc.notifications.adminCreateAnnouncement.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));

  async function upload(kind: "product" | "brand" | "category" | "banner", apply: (assetId: string) => void) {
    try {
      const asset = await pickAndUploadAdminAsset(kind);
      if (asset) {
        apply(asset.id);
        toast.show({ variant: "success", label: "Image uploaded." });
      }
    } catch (error) {
      toast.show({ variant: "danger", label: error instanceof Error ? error.message : "Upload failed." });
    }
  }

  async function shareBl(orderId: string) {
    try {
      const payload = await trpcClient.deliveryNotes.adminGeneratePdf.mutate({ orderId, ...bl });
      const fileUri = `${FileSystem.cacheDirectory}${payload.fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, payload.base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(fileUri, { mimeType: payload.mimeType, dialogTitle: payload.fileName });
    } catch (error) {
      toast.show({ variant: "danger", label: error instanceof Error ? error.message : "BL generation failed." });
    }
  }

  if (adminProbe.isError) {
    return (
      <Container className="p-6">
        <ShellEmptyState icon="shield-outline" title={t("adminLockedTitle")} body={t("adminLockedBody")} />
      </Container>
    );
  }

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
        <RestartRtlBanner />
        <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 30, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>{t("admin")}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {tabs.map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: activeTab === tab ? joumlaColors.pink : isDark ? joumlaColors.darkCard : "#FFFFFF", borderWidth: 1, borderColor: activeTab === tab ? joumlaColors.pink : isDark ? "#27334A" : joumlaColors.line }}>
              <Text selectable style={{ color: activeTab === tab ? "#FFFFFF" : isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "900" }}>{labels[tab]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {adminProbe.isLoading ? <Spinner size="sm" color="default" /> : null}

        {activeTab === "orders" ? (
          <View style={{ gap: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Pressable onPress={() => setOrderStatus(undefined)} style={{ padding: 10 }}><Text selectable style={{ color: joumlaColors.pink, fontWeight: "900" }}>All</Text></Pressable>
              {statuses.map((status) => <Pressable key={status} onPress={() => setOrderStatus(status)} style={{ padding: 10 }}><Text selectable style={{ color: orderStatus === status ? joumlaColors.pink : isDark ? "#CBD5E1" : joumlaColors.slate, fontWeight: "900" }}>{getOrderStatusLabel(language, status)}</Text></Pressable>)}
            </ScrollView>
            {(orders.data ?? []).map((order) => (
              <AdminCard key={order.id}>
                <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 18, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>{order.orderNumber}</Text>
                <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{order.customerFullNameSnapshot} · {order.customerPhoneLocalSnapshot ?? order.customerPhoneSnapshot}</Text>
                <Text selectable style={{ color: joumlaColors.pink, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>{formatDa(order.totalAmountSnapshot)}</Text>
                <View style={{ flexDirection: isRtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
                  <Button size="sm" variant="secondary" onPress={() => Linking.openURL(`tel:${order.customerPhoneSnapshot}`)}><Button.Label>Call</Button.Label></Button>
                  {statuses.map((status) => <Button key={status} size="sm" variant={order.status === status ? "secondary" : "outline"} onPress={() => updateStatus.mutate({ orderId: order.id, status })}><Button.Label>{getOrderStatusLabel(language, status)}</Button.Label></Button>)}
                </View>
                <Field placeholder="Old balance" value={bl.oldBalance} onChangeText={(oldBalance) => setBl({ ...bl, oldBalance })} />
                <Field placeholder="Versement" value={bl.paymentAmount} onChangeText={(paymentAmount) => setBl({ ...bl, paymentAmount })} />
                <Field placeholder="New balance" value={bl.newBalance} onChangeText={(newBalance) => setBl({ ...bl, newBalance })} />
                <Button onPress={() => shareBl(order.id)}><Button.Label>Generate/share BL</Button.Label></Button>
              </AdminCard>
            ))}
          </View>
        ) : null}

        {activeTab === "stock" ? (
          <View style={{ gap: 12 }}>
            {(products.data ?? []).map((product) => <AdminCard key={product.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "900" }}>{product.nameFr}</Text><Text selectable style={{ color: product.lowStockThreshold !== null && product.stockLots <= product.lowStockThreshold ? joumlaColors.pink : joumlaColors.slate }}>{product.stockLots} lots · threshold {product.lowStockThreshold ?? "none"}</Text></AdminCard>)}
            {(stockMovements.data ?? []).slice(0, 30).map((movement) => <AdminCard key={movement.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "900" }}>{movement.product?.nameFr}</Text><Text selectable style={{ color: joumlaColors.slate }}>{movement.quantityLotsDelta} lots · {movement.reason}</Text></AdminCard>)}
          </View>
        ) : null}

        {activeTab === "catalog" ? (
          <View style={{ gap: 12 }}>
            <AdminCard>
              <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 18, fontWeight: "900" }}>Create product</Text>
              <Field placeholder="French name" value={productForm.nameFr} onChangeText={(nameFr) => setProductForm({ ...productForm, nameFr })} />
              <Field placeholder="Arabic name" value={productForm.nameAr} onChangeText={(nameAr) => setProductForm({ ...productForm, nameAr })} />
              <Field placeholder="Unit price" value={productForm.unitPrice} onChangeText={(unitPrice) => setProductForm({ ...productForm, unitPrice })} />
              <Field placeholder="Lot quantity" value={productForm.lotQuantity} onChangeText={(lotQuantity) => setProductForm({ ...productForm, lotQuantity })} />
              <Field placeholder="Packaging" value={productForm.packagingLabel} onChangeText={(packagingLabel) => setProductForm({ ...productForm, packagingLabel })} />
              <Field placeholder="Brand id" value={productForm.brandId} onChangeText={(brandId) => setProductForm({ ...productForm, brandId })} />
              <Field placeholder="Category ids comma-separated" value={productForm.categoryIds} onChangeText={(categoryIds) => setProductForm({ ...productForm, categoryIds })} />
              <Field placeholder="Image asset id" value={productForm.imageAssetId} onChangeText={(imageAssetId) => setProductForm({ ...productForm, imageAssetId })} />
              <Button variant="secondary" onPress={() => upload("product", (imageAssetId) => setProductForm({ ...productForm, imageAssetId }))}><Button.Label>Upload product image</Button.Label></Button>
              <Field placeholder="Stock lots" value={productForm.stockLots} onChangeText={(stockLots) => setProductForm({ ...productForm, stockLots })} />
              <Field placeholder="Low stock threshold" value={productForm.lowStockThreshold} onChangeText={(lowStockThreshold) => setProductForm({ ...productForm, lowStockThreshold })} />
              <Button onPress={() => createProduct.mutate({ nameFr: productForm.nameFr, nameAr: productForm.nameAr, unitPrice: productForm.unitPrice, lotQuantity: Number(productForm.lotQuantity), packagingLabel: productForm.packagingLabel, brandId: productForm.brandId, categoryIds: productForm.categoryIds.split(",").map((entry) => entry.trim()).filter(Boolean), imageAssetId: productForm.imageAssetId, stockLots: Number(productForm.stockLots), lowStockThreshold: Number(productForm.lowStockThreshold), sortOrder: 0 })}><Button.Label>Create product</Button.Label></Button>
            </AdminCard>
            <AdminCard><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "900" }}>Create brand</Text><Field placeholder="Name" value={brandForm.name} onChangeText={(name) => setBrandForm({ ...brandForm, name })} /><Field placeholder="Logo asset id" value={brandForm.logoAssetId} onChangeText={(logoAssetId) => setBrandForm({ ...brandForm, logoAssetId })} /><Button variant="secondary" onPress={() => upload("brand", (logoAssetId) => setBrandForm({ ...brandForm, logoAssetId }))}><Button.Label>Upload logo</Button.Label></Button><Button onPress={() => createBrand.mutate({ ...brandForm, isActive: true, isFeatured: false, sortOrder: 0 })}><Button.Label>Create brand</Button.Label></Button></AdminCard>
            <AdminCard><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "900" }}>Create category</Text><Field placeholder="FR name" value={categoryForm.nameFr} onChangeText={(nameFr) => setCategoryForm({ ...categoryForm, nameFr })} /><Field placeholder="AR name" value={categoryForm.nameAr} onChangeText={(nameAr) => setCategoryForm({ ...categoryForm, nameAr })} /><Field placeholder="Image asset id" value={categoryForm.imageAssetId} onChangeText={(imageAssetId) => setCategoryForm({ ...categoryForm, imageAssetId })} /><Button variant="secondary" onPress={() => upload("category", (imageAssetId) => setCategoryForm({ ...categoryForm, imageAssetId }))}><Button.Label>Upload image</Button.Label></Button><Button onPress={() => createCategory.mutate({ ...categoryForm, isActive: true, isFeatured: false, sortOrder: 0 })}><Button.Label>Create category</Button.Label></Button></AdminCard>
            {(brands.data ?? []).map((brand) => <Text key={brand.id} selectable style={{ color: joumlaColors.slate }}>{brand.id} · {brand.name}</Text>)}
            {(categories.data ?? []).map((category) => <Text key={category.id} selectable style={{ color: joumlaColors.slate }}>{category.id} · {category.nameFr}</Text>)}
          </View>
        ) : null}

        {activeTab === "users" ? (
          <View style={{ gap: 12 }}>
            {(users.data ?? []).map((user) => <AdminCard key={user.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "900" }}>{user.name}</Text><Text selectable style={{ color: joumlaColors.slate }}>{user.email} · {user.role}</Text><Button size="sm" variant="danger-soft" isDisabled={user.isSeedOwner || user.isDisabled} onPress={() => disableUser.mutate({ userId: user.id })}><Button.Label>{user.isDisabled ? "Disabled" : "Disable"}</Button.Label></Button></AdminCard>)}
          </View>
        ) : null}

        {activeTab === "announcements" ? (
          <View style={{ gap: 12 }}>
            <AdminCard><Field placeholder="Title" value={announcement.title} onChangeText={(title) => setAnnouncement({ ...announcement, title })} /><Field placeholder="Body" value={announcement.body} onChangeText={(body) => setAnnouncement({ ...announcement, body })} /><Pressable onPress={() => setAnnouncement({ ...announcement, sendPush: !announcement.sendPush })}><Text selectable style={{ color: joumlaColors.pink, fontWeight: "900" }}>{announcement.sendPush ? "Push enabled" : "Push disabled"}</Text></Pressable><Button onPress={() => createAnnouncement.mutate(announcement)}><Button.Label>Publish announcement</Button.Label></Button></AdminCard>
            {(announcements.data ?? []).map((item) => <AdminCard key={item.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "900" }}>{item.title}</Text><Text selectable style={{ color: joumlaColors.slate }}>{item.body}</Text></AdminCard>)}
          </View>
        ) : null}
      </View>
    </Container>
  );
}
