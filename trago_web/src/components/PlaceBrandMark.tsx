import { useState } from 'react';
import { resolveBrandLogo } from '../lib/brandLogo';

type Props = {
  label: string;
  initials: string;
  tone: string;
  logoUrl?: string | null;
  officialBrand?: string | null;
  chainName?: string | null;
  nombre?: string | null;
  name?: string | null;
  website?: string | null;
};

export default function PlaceBrandMark({
  label,
  initials,
  tone,
  logoUrl,
  officialBrand,
  chainName,
  nombre,
  name,
  website,
}: Props) {
  const resolved = resolveBrandLogo({
    logoUrl,
    officialBrand,
    chainName,
    nombre,
    name,
    website,
  });
  const [broken, setBroken] = useState(false);
  const showLogo = Boolean(resolved && !broken);

  return (
    <div
      className={`cerca-place-mark${showLogo ? ' has-logo' : ''}`}
      style={showLogo ? undefined : { background: tone }}
      aria-hidden
      title={label}
    >
      {showLogo ? (
        <img
          src={resolved!}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
