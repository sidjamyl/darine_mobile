import { Ionicons } from "@expo/vector-icons";
import { Button, Card, FieldError, Input, Label, Spinner, TextField, useToast } from "heroui-native";
import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { getReadableErrorMessage, normalizeAlgerianPhone } from "@/lib/client-auth";
import { joumlaColors } from "@/lib/app-shell";
import { queryClient } from "@/utils/trpc";

const copy = {
  fr: {
    title: "Connexion",
    clientMode: "Client",
    adminMode: "Admin",
    clientBody: "Connectez-vous avec votre numero de telephone Joumla.",
    adminBody: "Connectez-vous avec votre email administrateur.",
    phone: "Telephone",
    phonePlaceholder: "0550 00 00 00 ou +213550000000",
    email: "Email admin",
    emailPlaceholder: "admin@joumla.dz",
    password: "Mot de passe",
    signIn: "Se connecter",
    invalidPhone: "Entrez un numero algerien valide.",
    invalidPassword: "Le mot de passe doit contenir au moins 6 caracteres.",
    success: "Connexion reussie.",
    failed: "Connexion impossible.",
    forgot: "Mot de passe oublie ?",
    forgotBody: "En V1, contactez l'administration Joumla pour reinitialiser votre mot de passe client.",
  },
  ar: {
    title: "تسجيل الدخول",
    clientMode: "عميل",
    adminMode: "ادمن",
    clientBody: "سجل الدخول برقم هاتفك في Joumla.",
    adminBody: "سجل الدخول ببريد الادارة.",
    phone: "رقم الهاتف",
    phonePlaceholder: "0550 00 00 00 او +213550000000",
    email: "بريد الادمن",
    emailPlaceholder: "admin@joumla.dz",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    invalidPhone: "ادخل رقم هاتف جزائري صحيح.",
    invalidPassword: "كلمة المرور يجب ان تحتوي على 6 احرف على الاقل.",
    success: "تم تسجيل الدخول.",
    failed: "تعذر تسجيل الدخول.",
    forgot: "نسيت كلمة المرور ؟",
    forgotBody: "في V1، اتصل بادارة Joumla لاعادة تعيين كلمة مرور العميل.",
  },
};

function SignIn() {
  const passwordInputRef = useRef<TextInput>(null);
  const { toast } = useToast();
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const [mode, setMode] = useState<"client" | "admin">("client");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForgotMessage, setShowForgotMessage] = useState(false);

  async function submit() {
    const normalizedPhone = mode === "client" ? normalizeAlgerianPhone(phoneNumber) : null;

    if (mode === "client" && !normalizedPhone) {
      setFormError(labels.invalidPhone);
      return;
    }

    if (password.length < 6) {
      setFormError(labels.invalidPassword);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = mode === "client"
        ? await authClient.signIn.phoneNumber({
            phoneNumber: normalizedPhone!.international,
            password,
            rememberMe: true,
          })
        : await authClient.signIn.email({
            email: email.trim(),
            password,
            rememberMe: true,
          });

      if (result.error) {
        const message = getReadableErrorMessage(result.error, labels.failed);
        setFormError(message);
        toast.show({ variant: "danger", label: message });
        return;
      }

      setPhoneNumber("");
      setEmail("");
      setPassword("");
      toast.show({ variant: "success", label: labels.success });
      await queryClient.invalidateQueries();
    } catch (error) {
      const message = getReadableErrorMessage(error, labels.failed);
      setFormError(message);
      toast.show({ variant: "danger", label: message });
    } finally {
      setIsSubmitting(false);
    }
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
          <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 24, fontWeight: "700" }}>
            {labels.title}
          </Text>
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
            {mode === "client" ? labels.clientBody : labels.adminBody}
          </Text>
        </View>

        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 10 }}>
          {(["client", "admin"] as const).map((entry) => (
            <Pressable
              key={entry}
              onPress={() => setMode(entry)}
              style={{
                flex: 1,
                borderRadius: 16,
                paddingVertical: 12,
                alignItems: "center",
                backgroundColor: mode === entry ? joumlaColors.navy : isDark ? joumlaColors.navySoft : joumlaColors.cream,
              }}
            >
              <Text selectable style={{ color: mode === entry ? "#FFFFFF" : joumlaColors.navy, fontWeight: "700" }}>
                {entry === "client" ? labels.clientMode : labels.adminMode}
              </Text>
            </Pressable>
          ))}
        </View>

        <FieldError isInvalid={!!formError}>{formError}</FieldError>

        {mode === "client" ? (
          <TextField isRequired>
            <Label>{labels.phone}</Label>
            <Input
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
          </TextField>
        ) : (
          <TextField isRequired>
            <Label>{labels.email}</Label>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder={labels.emailPlaceholder}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
          </TextField>
        )}

        <TextField isRequired>
          <Label>{labels.password}</Label>
          <View style={{ width: "100%", flexDirection: "row", alignItems: "center" }}>
            <Input
              ref={passwordInputRef}
              value={password}
              onChangeText={setPassword}
              placeholder="******"
              secureTextEntry={!isPasswordVisible}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              style={{ flex: 1, paddingRight: 44 }}
            />
            <Pressable onPress={() => setIsPasswordVisible((current) => !current)} style={{ position: "absolute", right: 14 }}>
              <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={18} color={joumlaColors.slate} />
            </Pressable>
          </View>
        </TextField>

        <Button onPress={submit} isDisabled={isSubmitting}>
          {isSubmitting ? <Spinner size="sm" color="default" /> : <Button.Label>{labels.signIn}</Button.Label>}
        </Button>

        <Pressable onPress={() => setShowForgotMessage((current) => !current)}>
          <Text selectable style={{ color: joumlaColors.pink, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>
            {labels.forgot}
          </Text>
        </Pressable>

        {showForgotMessage ? (
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, lineHeight: 20, textAlign: isRtl ? "right" : "left" }}>
            {labels.forgotBody}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export { SignIn };
