import { useMutation } from "@tanstack/react-query";
import { Button, Card, FieldError, Input, Label, Spinner, TextField, useToast } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { ClientAddressFields, type ClientAddressValue } from "@/components/client-address-fields";
import { useAppTheme } from "@/contexts/app-theme-context";
import { getReadableErrorMessage } from "@/lib/client-auth";
import { joumlaColors } from "@/lib/app-shell";
import { queryClient, trpc } from "@/utils/trpc";

type ProfileData = {
  user: {
    name: string;
    phoneNumber: string | null;
    phoneNumberLocal: string | null;
  };
  profile: {
    fullName: string;
    wilayaId: string;
    communeId: string;
    streetAddress: string;
    latitude: string | null;
    longitude: string | null;
  } | null;
};

type ProfileEditorErrors = Partial<Record<"fullName" | keyof ClientAddressValue, string>>;

type ProfileEditorProps = {
  data: ProfileData;
};

const copy = {
  fr: {
    title: "Profil client",
    body: "Votre telephone est protege. Seul un admin peut le modifier.",
    fullName: "Nom complet",
    phone: "Telephone",
    save: "Enregistrer le profil",
    invalidName: "Entrez votre nom complet.",
    missingWilaya: "Choisissez une wilaya.",
    missingCommune: "Choisissez une commune.",
    missingAddress: "Entrez une adresse.",
    success: "Profil mis a jour.",
    failed: "Mise a jour impossible.",
    incomplete: "Completez votre profil pour pouvoir passer commande.",
  },
  ar: {
    title: "ملف العميل",
    body: "رقم الهاتف محمي. يستطيع الادمن فقط تعديله.",
    fullName: "الاسم الكامل",
    phone: "رقم الهاتف",
    save: "حفظ الملف",
    invalidName: "ادخل الاسم الكامل.",
    missingWilaya: "اختر الولاية.",
    missingCommune: "اختر البلدية.",
    missingAddress: "ادخل العنوان.",
    success: "تم تحديث الملف.",
    failed: "تعذر تحديث الملف.",
    incomplete: "اكمل ملفك الشخصي قبل الطلب.",
  },
};

function parseCoordinate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createAddressFromProfile(profile: ProfileData["profile"]): ClientAddressValue {
  return {
    wilayaId: profile?.wilayaId ?? "",
    communeId: profile?.communeId ?? "",
    streetAddress: profile?.streetAddress ?? "",
    latitude: parseCoordinate(profile?.latitude),
    longitude: parseCoordinate(profile?.longitude),
  };
}

export function ProfileEditor({ data }: ProfileEditorProps) {
  const nameInputRef = useRef<TextInput>(null);
  const { toast } = useToast();
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const [fullName, setFullName] = useState(data.profile?.fullName ?? data.user.name);
  const [address, setAddress] = useState<ClientAddressValue>(() => createAddressFromProfile(data.profile));
  const [errors, setErrors] = useState<ProfileEditorErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(data.profile?.fullName ?? data.user.name);
    setAddress(createAddressFromProfile(data.profile));
  }, [data]);

  const upsertProfile = useMutation(
    trpc.profile.upsert.mutationOptions({
      onError(error) {
        const message = getReadableErrorMessage(error, labels.failed);
        setFormError(message);
        toast.show({ variant: "danger", label: message });
      },
      async onSuccess() {
        setErrors({});
        setFormError(null);
        toast.show({ variant: "success", label: labels.success });
        await queryClient.invalidateQueries();
      },
    }),
  );

  function validate() {
    const nextErrors: ProfileEditorErrors = {};

    if (fullName.trim().length < 2) nextErrors.fullName = labels.invalidName;
    if (!address.wilayaId) nextErrors.wilayaId = labels.missingWilaya;
    if (!address.communeId) nextErrors.communeId = labels.missingCommune;
    if (!address.streetAddress.trim()) nextErrors.streetAddress = labels.missingAddress;

    setErrors(nextErrors);
    return nextErrors;
  }

  function submit() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) return;

    upsertProfile.mutate({
      fullName: fullName.trim(),
      wilayaId: address.wilayaId,
      communeId: address.communeId,
      streetAddress: address.streetAddress.trim(),
      latitude: address.latitude ?? undefined,
      longitude: address.longitude ?? undefined,
    });
  }

  const phoneNumber = data.user.phoneNumberLocal ?? data.user.phoneNumber ?? "-";
  const isComplete = !!data.profile;

  return (
    <Card
      style={{
        backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
        borderRadius: 28,
        borderWidth: 1,
        borderColor: isDark ? "#27334A" : joumlaColors.line,
        padding: 20,
      }}
    >
      <View style={{ gap: 16 }}>
        <View style={{ gap: 4, alignItems: isRtl ? "flex-end" : "flex-start" }}>
          <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 24, fontWeight: "800" }}>
            {labels.title}
          </Text>
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
            {isComplete ? labels.body : labels.incomplete}
          </Text>
        </View>

        <FieldError isInvalid={!!formError}>{formError}</FieldError>

        <TextField isRequired isInvalid={!!errors.fullName}>
          <Label>{labels.fullName}</Label>
          <Input
            ref={nameInputRef}
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            textContentType="name"
          />
          <FieldError>{errors.fullName}</FieldError>
        </TextField>

        <TextField isDisabled>
          <Label>{labels.phone}</Label>
          <Input value={phoneNumber} editable={false} />
        </TextField>

        <ClientAddressFields value={address} onChange={setAddress} errors={errors} />

        <Button onPress={submit} isDisabled={upsertProfile.isPending}>
          {upsertProfile.isPending ? <Spinner size="sm" color="default" /> : <Button.Label>{labels.save}</Button.Label>}
        </Button>
      </View>
    </Card>
  );
}
