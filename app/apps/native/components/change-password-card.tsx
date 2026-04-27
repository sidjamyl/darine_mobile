import { Ionicons } from "@expo/vector-icons";
import { Button, Card, FieldError, Input, Label, Spinner, TextField, useToast } from "heroui-native";
import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { getReadableErrorMessage } from "@/lib/client-auth";
import { joumlaColors } from "@/lib/app-shell";

const copy = {
  fr: {
    title: "Mot de passe",
    body: "Changez votre mot de passe depuis votre profil.",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le nouveau mot de passe",
    submit: "Changer le mot de passe",
    invalidCurrent: "Entrez le mot de passe actuel.",
    invalidNew: "Le nouveau mot de passe doit contenir au moins 6 caracteres.",
    mismatch: "Les mots de passe ne correspondent pas.",
    success: "Mot de passe mis a jour.",
    failed: "Changement impossible.",
  },
  ar: {
    title: "كلمة المرور",
    body: "غير كلمة المرور من ملفك الشخصي.",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تاكيد كلمة المرور الجديدة",
    submit: "تغيير كلمة المرور",
    invalidCurrent: "ادخل كلمة المرور الحالية.",
    invalidNew: "كلمة المرور الجديدة يجب ان تحتوي على 6 احرف على الاقل.",
    mismatch: "كلمتا المرور غير متطابقتين.",
    success: "تم تحديث كلمة المرور.",
    failed: "تعذر تغيير كلمة المرور.",
  },
};

type PasswordErrors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;

export function ChangePasswordCard() {
  const newPasswordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const { toast } = useToast();
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function validate() {
    const nextErrors: PasswordErrors = {};

    if (!currentPassword) nextErrors.currentPassword = labels.invalidCurrent;
    if (newPassword.length < 6) nextErrors.newPassword = labels.invalidNew;
    if (newPassword !== confirmPassword) nextErrors.confirmPassword = labels.mismatch;

    setErrors(nextErrors);
    return nextErrors;
  }

  async function submit() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (result.error) {
        const message = getReadableErrorMessage(result.error, labels.failed);
        setFormError(message);
        toast.show({ variant: "danger", label: message });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      toast.show({ variant: "success", label: labels.success });
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
          <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 24, fontWeight: "800" }}>
            {labels.title}
          </Text>
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
            {labels.body}
          </Text>
        </View>

        <FieldError isInvalid={!!formError}>{formError}</FieldError>

        <TextField isRequired isInvalid={!!errors.currentPassword}>
          <Label>{labels.currentPassword}</Label>
          <View style={{ width: "100%", flexDirection: "row", alignItems: "center" }}>
            <Input
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="******"
              secureTextEntry={!isPasswordVisible}
              autoComplete="password"
              textContentType="password"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => newPasswordInputRef.current?.focus()}
              style={{ flex: 1, paddingRight: 44 }}
            />
            <Pressable onPress={() => setIsPasswordVisible((current) => !current)} style={{ position: "absolute", right: 14 }}>
              <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={18} color={joumlaColors.slate} />
            </Pressable>
          </View>
          <FieldError>{errors.currentPassword}</FieldError>
        </TextField>

        <TextField isRequired isInvalid={!!errors.newPassword}>
          <Label>{labels.newPassword}</Label>
          <Input
            ref={newPasswordInputRef}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="******"
            secureTextEntry={!isPasswordVisible}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
          />
          <FieldError>{errors.newPassword}</FieldError>
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
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <FieldError>{errors.confirmPassword}</FieldError>
        </TextField>

        <Button onPress={submit} isDisabled={isSubmitting}>
          {isSubmitting ? <Spinner size="sm" color="default" /> : <Button.Label>{labels.submit}</Button.Label>}
        </Button>
      </View>
    </Card>
  );
}
