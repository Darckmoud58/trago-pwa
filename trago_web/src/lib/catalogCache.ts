/** Limpia caché de catálogo al cambiar banda de edad (SW + Cache API). */
export async function clearCatalogCache(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      await caches.delete('trago-api-catalog');
    }
  } catch {
    /* ignore */
  }
}
