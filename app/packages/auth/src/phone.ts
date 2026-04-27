const ALGERIA_PHONE_LOCAL_REGEX = /^0[567]\d{8}$/;
const ALGERIA_PHONE_INTERNATIONAL_REGEX = /^\+213[567]\d{8}$/;
const CLIENT_EMAIL_DOMAIN = "clients.joumla.local";

export type NormalizedAlgerianPhone = {
  local: string;
  international: string;
};

export function normalizeAlgerianPhone(input: string): NormalizedAlgerianPhone | null {
  const value = input.trim().replace(/[\s.-]/g, "");

  if (ALGERIA_PHONE_LOCAL_REGEX.test(value)) {
    return {
      local: value,
      international: `+213${value.slice(1)}`,
    };
  }

  if (ALGERIA_PHONE_INTERNATIONAL_REGEX.test(value)) {
    return {
      local: `0${value.slice(4)}`,
      international: value,
    };
  }

  return null;
}

export function createClientTechnicalEmail(phoneInternational: string) {
  const numericPhone = phoneInternational.replace(/\D/g, "");
  return `client-${numericPhone}@${CLIENT_EMAIL_DOMAIN}`;
}

export function isClientTechnicalEmail(email: string) {
  return email.endsWith(`@${CLIENT_EMAIL_DOMAIN}`);
}
