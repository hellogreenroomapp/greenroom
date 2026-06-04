export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  return slugRegex.test(slug)
}

export function validateSKU(sku: string): boolean {
  return sku.trim().length > 0 && sku.trim().length <= 50
}

export function validateRequired(value: string): boolean {
  return value.trim().length > 0
}

export function validateMinLength(value: string, min: number): boolean {
  return value.trim().length >= min
}

export function validateMaxLength(value: string, max: number): boolean {
  return value.trim().length <= max
}
