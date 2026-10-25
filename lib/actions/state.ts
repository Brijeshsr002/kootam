// Shared shape for useActionState forms.
export type ActionState = { error?: string; ok?: string } | undefined;

export function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optional(value: string): string | null {
  return value === "" ? null : value;
}
