import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, FieldError, Input, Label, Spinner, TextField, useToast } from "heroui-native";
import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { ClientAddressFields, type ClientAddressValue } from "@/components/client-address-fields";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { getReadableErrorMessage, normalizeAlgerianPhone } from "@/lib/client-auth";
import { joumlaColors } from "@/lib/app-shell";
import { queryClient, trpc } from "@/utils/trpc";

const copy = {
  fr: {
    title: "Creer un compte client",
    body: "Renseignez vos informations pour commander en gros chez Joumla.",
    fullName: "Nom complet",
    fullNamePlaceholder: "Nom et prenom",
    phone: "Telephone",
    phonePlaceholder: "0550 00 00 00",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    submit: "Creer le compte",
    invalidName: "Entrez votre nom complet.",
    invalidPhone: "Entrez un numero algerien valide.",
    invalidPassword: "Le mot de passe doit contenir au moins 6 caracteres.",
    passwordMismatch: "Les mots de passe ne correspondent pas.",
    missingWilaya: "Choisissez une wilaya.",
    missingCommune: "Choisissez une commune.",
    missingAddress: "Entrez une adresse.",
    success: "Compte cree et connecte.",
    failed: "Creation du compte impossible.",
  },
  ar: {
    title: "انشاء حساب عميل",
    body: "ادخل معلوماتك للطلب بالجملة من Joumla.",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "الاسم واللقب",
    phone: "رقم الهاتف",
    phonePlaceholder: "0550 00 00 00",
    password: "كلمة المرور",
    confirmPassword: "تاكيد كلمة المرور",
    submit: "انشاء الحساب",
    invalidName: "ادخل الاسم الكامل.",
    invalidPhone: "ادخل رقم هاتف جزائري صحيح.",
    invalidPassword: "كلمة المرور يجب ان تحتوي على 6 احرف على الاقل.",
    passwordMismatch: "كلمتا المرور غير متطابقتين.",
    missingWilaya: "اختر الولاية.",
    missingCommune: "اختر البلدية.",
    missingAddress: "ادخل العنوان.",
    success: "تم انشاء الحساب وتسجيل الدخول.",
    failed: "تعذر انشاء الحساب.",
  },
};

type SignUpErrors = Partial<Record<"fullName" | "phoneNumber" | "password" | "confirmPassword" | keyof ClientAddressValue, string>>;

const emptyAddress: ClientAddressValue = {
  wilayaId: "",
  communeId: "",
  streetAddress: "",
  latitude: null,
  longitude: null,
};

export function SignUp() {
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const { toast } = useToast();
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState<ClientAddressValue>(emptyAddress);
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const registerClient = useMutation(
    trpc.auth.registerClient.mutationOptions({
      onError(error) {
        const message = getReadableErrorMessage(error, labels.failed);
        setFormError(message);
        toast.show({ variant: "danger", label: message });
      },
      async onSuccess(_, variables) {
        const normalizedPhone = normalizeAlgerianPhone(variables.phoneNumber);
        if (!normalizedPhone) return;

        const result = await authClient.signIn.phoneNumber({
          phoneNumber: normalizedPhone.international,
          password: variables.password,
          rememberMe: true,
        });

        if (result.error) {
          const message = getReadableErrorMessage(result.error, labels.failed);
          setFormError(message);
          toast.show({ variant: "danger", label: message });
          return;
        }

        setFullName("");
        setPhoneNumber("");
        setPassword("");
        setConfirmPassword("");
        setAddress(emptyAddress);
        setErrors({});
        toast.show({ variant: "success", label: labels.success });
        await queryClient.invalidateQueries();
      },
    }),
  );

  function validate() {
    const nextErrors: SignUpErrors = {};
    const normalizedPhone = normalizeAlgerianPhone(phoneNumber);

    if (fullName.trim().length < 2) nextErrors.fullName = labels.invalidName;
    if (!normalizedPhone) nextErrors.phoneNumber = labels.invalidPhone;
    if (password.length < 6) nextErrors.password = labels.invalidPassword;
    if (confirmPassword !== password) nextErrors.confirmPassword = labels.passwordMismatch;
    if (!address.wilayaId) nextErrors.wilayaId = labels.missingWilaya;
    if (!address.communeId) nextErrors.communeId = labels.missingCommune;
    if (!address.streetAddress.trim()) nextErrors.streetAddress = labels.missingAddress;

    setErrors(nextErrors);
    return { errors: nextErrors, normalizedPhone };
  }

  function submit() {
    const result = validate();

    if (Object.keys(result.errors).length > 0 || !result.normalizedPhone) {
      return;
    }

    setFormError(null);
    registerClient.mutate({
      fullName: fullName.trim(),
      phoneNumber: result.normalizedPhone.international,
      password,
      confirmPassword,
      wilayaId: address.wilayaId,
      communeId: address.communeId,
      streetAddress: address.streetAddress.trim(),
      latitude: address.latitude ?? undefined,
      longitude: address.longitude ?? undefined,
    });
  }

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
            {labels.body}
          </Text>
        </View>

        <FieldError isInvalid={!!formError}>{formError}</FieldError>

        <TextField isRequired isInvalid={!!errors.fullName}>
          <Label>{labels.fullName}</Label>
          <Input
            value={fullName}
            onChangeText={setFullName}
            placeholder={labels.fullNamePlaceholder}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => phoneInputRef.current?.focus()}
          />
          <FieldError>{errors.fullName}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.phoneNumber}>
          <Label>{labels.phone}</Label>
          <Input
            ref={phoneInputRef}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder={labels.phonePlaceholder}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
          />
          <FieldError>{errors.phoneNumber}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.password}>
          <Label>{labels.password}</Label>
          <View style={{ width: "100%", flexDirection: "row", alignItems: "center" }}>
            <Input
              ref={passwordInputRef}
              value={password}
              onChangeText={setPassword}
              placeholder="******"
              secureTextEntry={!isPasswordVisible}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              style={{ flex: 1, paddingRight: 44 }}
            />
            <Pressable onPress={() => setIsPasswordVisible((current) => !current)} style={{ position: "absolute", right: 14 }}>
              <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={18} color={joumlaColors.slate} />
            </Pressable>
          </View>
          <FieldError>{errors.password}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.confirmPassword}>
          <Label>{labels.confirmPassword}</Label>
          <Input
            ref={confirmPasswordInputRef}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="******"
            secureTextEntry={!isPasswordVisible}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
          />
          <FieldError>{errors.confirmPassword}</FieldError>
        </TextField>

        <ClientAddressFields value={address} onChange={setAddress} errors={errors} />

        <Button onPress={submit} isDisabled={registerClient.isPending}>
          {registerClient.isPending ? <Spinner size="sm" color="default" /> : <Button.Label>{labels.submit}</Button.Label>}
        </Button>
      </View>
    </Card>
  );
}
