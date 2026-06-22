export interface EnumOption {
  value: string;
  label: string;
}

export function toEnumOptions<T extends string>(
  enumObj: Record<string, T>,
  labels: Record<T, string>,
): EnumOption[] {
  return Object.values(enumObj).map((value) => ({
    value,
    label: labels[value],
  }));
}
