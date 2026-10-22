let counter = 0

/** Short, collision-resistant id (no crypto dependency so it also works in tests). */
export function uid(prefix = ''): string {
  counter = (counter + 1) % 1679616
  const rand = Math.random().toString(36).slice(2, 8)
  const time = Date.now().toString(36).slice(-5)
  return `${prefix}${time}${counter.toString(36).padStart(4, '0')}${rand}`
}

// Letters that don't decompose into a base letter plus accents.
const PLAIN: Record<string, string> = { ł: 'l', ø: 'o', ß: 'ss', æ: 'ae', œ: 'oe', đ: 'd', ð: 'd', ı: 'i', þ: 'th', ħ: 'h' }

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[łøßæœđðıþħ]/g, (c) => PLAIN[c])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function deepClone<T>(v: T): T {
  return structuredClone(v)
}
