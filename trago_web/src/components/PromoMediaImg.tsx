import { useState, type ReactNode } from 'react';
import { resolveMediaUrl } from '../lib/mediaUrl';

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fallback?: ReactNode;
};

/** Imagen de promo con fallback si la URL falla (CDN 403 / rota). */
export default function PromoMediaImg({
  src,
  alt = '',
  className,
  loading = 'lazy',
  fallback = null,
}: Props) {
  const resolved = resolveMediaUrl(src);
  const [broken, setBroken] = useState(false);
  if (!resolved || broken) return <>{fallback}</>;
  return (
    <img
      className={className}
      src={resolved}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}
