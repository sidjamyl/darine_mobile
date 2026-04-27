import { useQuery } from "@tanstack/react-query";
import { FieldError, Input, Label, TextField } from "heroui-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { LocationPicker } from "@/components/location-picker";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";
import { trpc } from "@/utils/trpc";

export type ClientAddressValue = {
  wilayaId: string;
  communeId: string;
  streetAddress: string;
  latitude: number | null;
  longitude: number | null;
};

type ClientAddressErrors = Partial<Record<keyof ClientAddressValue, string>>;

type ClientAddressFieldsProps = {
  value: ClientAddressValue;
  onChange: (value: ClientAddressValue) => void;
  errors?: ClientAddressErrors;
};

const copy = {
  fr: {
    wilaya: "Wilaya",
    commune: "Commune",
    streetAddress: "Adresse",
    searchWilaya: "Chercher une wilaya",
    searchCommune: "Chercher une commune",
    chooseWilaya: "Choisissez d'abord une wilaya.",
    addressPlaceholder: "Rue, quartier, repere...",
    loading: "Chargement...",
    noResult: "Aucun resultat.",
  },
  ar: {
    wilaya: "الولاية",
    commune: "البلدية",
    streetAddress: "العنوان",
    searchWilaya: "ابحث عن ولاية",
    searchCommune: "ابحث عن بلدية",
    chooseWilaya: "اختر الولاية اولا.",
    addressPlaceholder: "الشارع، الحي، علامة قريبة...",
    loading: "جاري التحميل...",
    noResult: "لا توجد نتائج.",
  },
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

type LocationOption = {
  id: string;
  nameFr: string;
  nameAr: string;
};

function OptionButton({
  option,
  isSelected,
  onPress,
}: {
  option: LocationOption;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { language, isDark, isRtl } = useAppTheme();
  const label = language === "ar" ? option.nameAr : option.nameFr;

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: isSelected ? joumlaColors.pink : isDark ? "#334155" : joumlaColors.line,
        backgroundColor: isSelected ? joumlaColors.pinkSoft : isDark ? "#111827" : "#FFFFFF",
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text
        selectable
        style={{
          color: isSelected ? joumlaColors.navy : isDark ? "#E2E8F0" : joumlaColors.navy,
          fontWeight: isSelected ? "800" : "600",
          textAlign: isRtl ? "right" : "left",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ClientAddressFields({ value, onChange, errors }: ClientAddressFieldsProps) {
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const [wilayaSearch, setWilayaSearch] = useState("");
  const [communeSearch, setCommuneSearch] = useState("");

  const wilayas = useQuery(trpc.locations.wilayas.queryOptions());
  const communes = useQuery({
    ...trpc.locations.communesByWilaya.queryOptions({ wilayaId: value.wilayaId }),
    enabled: value.wilayaId.length > 0,
  });

  const wilayaQuery = normalizeSearch(wilayaSearch);
  const communeQuery = normalizeSearch(communeSearch);
  const filteredWilayas = (wilayas.data ?? [])
    .filter((option) => {
      if (!wilayaQuery) return true;
      return `${option.nameFr} ${option.nameAr}`.toLowerCase().includes(wilayaQuery);
    })
    .slice(0, 8);
  const filteredCommunes = (communes.data ?? [])
    .filter((option) => {
      if (!communeQuery) return true;
      return `${option.nameFr} ${option.nameAr}`.toLowerCase().includes(communeQuery);
    })
    .slice(0, 8);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <TextField isRequired isInvalid={!!errors?.wilayaId}>
          <Label>{labels.wilaya}</Label>
          <Input value={wilayaSearch} onChangeText={setWilayaSearch} placeholder={labels.searchWilaya} />
          <FieldError>{errors?.wilayaId}</FieldError>
        </TextField>

        <View style={{ gap: 8 }}>
          {wilayas.isLoading ? (
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
              {labels.loading}
            </Text>
          ) : null}
          {filteredWilayas.map((option) => (
            <OptionButton
              key={option.id}
              option={option}
              isSelected={value.wilayaId === option.id}
              onPress={() => {
                onChange({ ...value, wilayaId: option.id, communeId: "" });
                setWilayaSearch(language === "ar" ? option.nameAr : option.nameFr);
                setCommuneSearch("");
              }}
            />
          ))}
          {!wilayas.isLoading && filteredWilayas.length === 0 ? (
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
              {labels.noResult}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <TextField isRequired isInvalid={!!errors?.communeId} isDisabled={!value.wilayaId}>
          <Label>{labels.commune}</Label>
          <Input
            value={communeSearch}
            onChangeText={setCommuneSearch}
            placeholder={value.wilayaId ? labels.searchCommune : labels.chooseWilaya}
            editable={value.wilayaId.length > 0}
          />
          <FieldError>{errors?.communeId}</FieldError>
        </TextField>

        <View style={{ gap: 8 }}>
          {communes.isLoading && value.wilayaId ? (
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
              {labels.loading}
            </Text>
          ) : null}
          {filteredCommunes.map((option) => (
            <OptionButton
              key={option.id}
              option={option}
              isSelected={value.communeId === option.id}
              onPress={() => {
                onChange({ ...value, communeId: option.id });
                setCommuneSearch(language === "ar" ? option.nameAr : option.nameFr);
              }}
            />
          ))}
          {!communes.isLoading && value.wilayaId && filteredCommunes.length === 0 ? (
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
              {labels.noResult}
            </Text>
          ) : null}
        </View>
      </View>

      <TextField isRequired isInvalid={!!errors?.streetAddress}>
        <Label>{labels.streetAddress}</Label>
        <Input
          value={value.streetAddress}
          onChangeText={(streetAddress) => onChange({ ...value, streetAddress })}
          placeholder={labels.addressPlaceholder}
          multiline
          numberOfLines={3}
        />
        <FieldError>{errors?.streetAddress}</FieldError>
      </TextField>

      <LocationPicker
        latitude={value.latitude}
        longitude={value.longitude}
        onChange={(coordinates) => onChange({ ...value, ...coordinates })}
        onAddressSelected={(address) => {
          if (!value.streetAddress.trim()) {
            onChange({ ...value, streetAddress: address });
          }
        }}
      />
    </View>
  );
}
