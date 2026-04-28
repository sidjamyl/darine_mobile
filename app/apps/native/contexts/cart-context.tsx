import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Button, useToast } from "heroui-native";
import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { formatDa, getLocalizedName } from "@/components/catalog/catalog-format";
import type { CatalogProductSummary } from "@/components/catalog/catalog-product-card";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { joumlaColors } from "@/lib/app-shell";

export type CartProductSnapshot = Pick<
  CatalogProductSummary,
  "id" | "nameFr" | "nameAr" | "unitPrice" | "lotPrice" | "lotQuantity" | "packagingLabel" | "stockLots" | "discountLotPrice" | "image"
>;

export type CartItem = {
  product: CartProductSnapshot;
  quantityLots: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalAmount: string;
  requestAdd: (product: CartProductSnapshot) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  setQuantity: (productId: string, quantityLots: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const CART_STORAGE_PREFIX = "joumla-cart";

const copy = {
  fr: {
    loginRequired: "Connectez-vous pour ajouter au panier.",
    title: "Quantite en lots",
    stock: "Stock disponible",
    add: "Ajouter au panier",
    updated: "Panier mis a jour.",
    maxReached: "Stock maximum atteint.",
  },
  ar: {
    loginRequired: "سجل الدخول لاضافة المنتج الى السلة.",
    title: "الكمية بالحزم",
    stock: "المخزون المتوفر",
    add: "اضافة الى السلة",
    updated: "تم تحديث السلة.",
    maxReached: "تم بلوغ المخزون الاقصى.",
  },
};

function getEffectiveLotPrice(product: CartProductSnapshot) {
  return product.discountLotPrice || product.lotPrice;
}

function normalizeQuantity(quantityLots: number, stockLots: number) {
  return Math.max(1, Math.min(stockLots, quantityLots));
}

function getStorageKey(userId: string) {
  return `${CART_STORAGE_PREFIX}:${userId}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const sheetRef = useRef<BottomSheet>(null);
  const { data: session } = authClient.useSession();
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CartProductSnapshot | null>(null);
  const [pendingProduct, setPendingProduct] = useState<CartProductSnapshot | null>(null);
  const [sheetQuantity, setSheetQuantity] = useState(1);
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    let isMounted = true;

    async function loadCart() {
      if (!userId) {
        setItems([]);
        return;
      }

      try {
        const stored = await SecureStore.getItemAsync(getStorageKey(userId));
        if (!isMounted) return;
        setItems(stored ? (JSON.parse(stored) as CartItem[]) : []);
      } catch {
        if (isMounted) setItems([]);
      }
    }

    void loadCart();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    void SecureStore.setItemAsync(getStorageKey(userId), JSON.stringify(items));
  }, [items, userId]);

  useEffect(() => {
    if (!session?.user || !pendingProduct) return;

    setSelectedProduct(pendingProduct);
    setSheetQuantity(1);
    setPendingProduct(null);
    router.push("/cart");
    requestAnimationFrame(() => sheetRef.current?.expand());
  }, [pendingProduct, session?.user]);

  const saveItem = useCallback((product: CartProductSnapshot, quantityLots: number) => {
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      const normalizedQuantity = normalizeQuantity(quantityLots, product.stockLots);

      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? {
                product,
                quantityLots: normalizedQuantity,
              }
            : item,
        );
      }

      return [...current, { product, quantityLots: normalizedQuantity }];
    });
  }, []);

  const requestAdd = useCallback(
    (product: CartProductSnapshot) => {
      if (!session?.user) {
        setPendingProduct(product);
        toast.show({ variant: "danger", label: labels.loginRequired });
        router.push("/profile");
        return;
      }

      const existing = items.find((item) => item.product.id === product.id);
      setSelectedProduct(product);
      setSheetQuantity(existing?.quantityLots ?? 1);
      sheetRef.current?.expand();
    },
    [items, labels.loginRequired, session?.user, toast],
  );

  const setQuantity = useCallback((productId: string, quantityLots: number) => {
    setItems((current) =>
      current.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantityLots: normalizeQuantity(quantityLots, item.product.stockLots),
            }
          : item,
      ),
    );
  }, []);

  const increment = useCallback(
    (productId: string) => {
      const item = items.find((entry) => entry.product.id === productId);
      if (item && item.quantityLots >= item.product.stockLots) {
        toast.show({ variant: "danger", label: labels.maxReached });
        return;
      }
      setQuantity(productId, (item?.quantityLots ?? 0) + 1);
    },
    [items, labels.maxReached, setQuantity, toast],
  );

  const decrement = useCallback(
    (productId: string) => {
      const item = items.find((entry) => entry.product.id === productId);
      if (!item || item.quantityLots <= 1) return;
      setQuantity(productId, item.quantityLots - 1);
    },
    [items, setQuantity],
  );

  const remove = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.product.id !== productId));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantityLots, 0), [items]);
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(getEffectiveLotPrice(item.product)) * item.quantityLots, 0).toFixed(3),
    [items],
  );

  const value = useMemo(
    () => ({ items, itemCount, totalAmount, requestAdd, increment, decrement, setQuantity, remove, clear }),
    [clear, decrement, increment, itemCount, items, remove, requestAdd, setQuantity, totalAmount],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={["44%"]}
        enablePanDownToClose
        backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
        backgroundStyle={{ backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF" }}
        handleIndicatorStyle={{ backgroundColor: isDark ? "#64748B" : "#CBD5E1" }}
      >
        <BottomSheetView style={{ padding: 20, gap: 18 }}>
          {selectedProduct ? (
            <>
              <View style={{ gap: 8, alignItems: isRtl ? "flex-end" : "flex-start" }}>
                <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 22, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
                  {getLocalizedName(language, selectedProduct)}
                </Text>
                <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
                  {labels.stock}: {selectedProduct.stockLots}
                </Text>
              </View>

              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 18, fontWeight: "900" }}>
                  {labels.title}
                </Text>
                <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                  <Pressable
                    onPress={() => setSheetQuantity((current) => Math.max(1, current - 1))}
                    style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream }}
                  >
                    <Ionicons name="remove" size={20} color={joumlaColors.pink} />
                  </Pressable>
                  <Text selectable style={{ minWidth: 34, color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 24, fontWeight: "900", textAlign: "center", fontVariant: ["tabular-nums"] }}>
                    {sheetQuantity}
                  </Text>
                  <Pressable
                    onPress={() => setSheetQuantity((current) => Math.min(selectedProduct.stockLots, current + 1))}
                    style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream }}
                  >
                    <Ionicons name="add" size={20} color={joumlaColors.pink} />
                  </Pressable>
                </View>
              </View>

              <Text selectable style={{ color: joumlaColors.pink, fontSize: 20, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
                {formatDa(Number(getEffectiveLotPrice(selectedProduct)) * sheetQuantity)}
              </Text>

              <Button
                onPress={() => {
                  saveItem(selectedProduct, sheetQuantity);
                  sheetRef.current?.close();
                  toast.show({ variant: "success", label: labels.updated });
                }}
              >
                <Button.Label>{labels.add}</Button.Label>
              </Button>
            </>
          ) : null}
        </BottomSheetView>
      </BottomSheet>
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
