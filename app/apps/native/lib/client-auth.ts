export type NormalizedAlgerianPhone = {
  local: string;
  international: string;
};

const ALGERIA_PHONE_LOCAL_REGEX = /^0[567]\d{8}$/;
const ALGERIA_PHONE_INTERNATIONAL_REGEX = /^\+213[567]\d{8}$/;

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

export function getReadableErrorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown; error?: { message?: unknown } };

    if (typeof maybeError.message === "string") {
      return maybeError.message;
    }

    if (typeof maybeError.error?.message === "string") {
      return maybeError.error.message;
    }
  }

  return fallback;
}
