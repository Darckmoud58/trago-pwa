export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function uniqueSlug(Model, base, field = 'slug') {
  let slug = slugify(base) || `item-${Date.now()}`;
  let n = 0;
  while (await Model.exists({ [field]: slug })) {
    n += 1;
    slug = `${slugify(base).slice(0, 70)}-${n}`;
  }
  return slug;
}
