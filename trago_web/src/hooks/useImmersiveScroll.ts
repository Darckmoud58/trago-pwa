import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Atmósfera de scroll: clase is-scrolled, --scroll-y para parallax,
 * y revelado de [data-reveal] / .scroll-reveal (también si llegan tarde).
 */
export function useImmersiveScroll(shellSelector = '.app-shell') {
  const { pathname } = useLocation();

  useEffect(() => {
    const shell = document.querySelector(shellSelector);
    if (!shell) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || document.documentElement.scrollTop;
        shell.classList.toggle('is-scrolled', y > 12);
        (shell as HTMLElement).style.setProperty(
          '--scroll-y',
          String(Math.min(y, 900))
        );
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [shellSelector]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      document
        .querySelectorAll<HTMLElement>('[data-reveal], .scroll-reveal')
        .forEach((el) => el.classList.add('is-inview'));
      return;
    }

    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-inview');
          io.unobserve(entry.target);
        }
      },
      {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.08,
      }
    );

    function watch(el: HTMLElement) {
      if (seen.has(el)) return;
      seen.add(el);
      if (!el.classList.contains('scroll-reveal')) {
        el.classList.add('scroll-reveal');
      }
      if (el.classList.contains('is-inview')) return;
      io.observe(el);
    }

    function scan() {
      document
        .querySelectorAll<HTMLElement>('[data-reveal], .scroll-reveal')
        .forEach(watch);
    }

    const boot = window.setTimeout(scan, 40);
    const safety = window.setTimeout(() => {
      document
        .querySelectorAll<HTMLElement>('[data-reveal], .scroll-reveal')
        .forEach((el) => el.classList.add('is-inview'));
    }, 4200);

    const root = document.getElementById('main') || document.body;
    const mo = new MutationObserver(() => scan());
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(boot);
      window.clearTimeout(safety);
      mo.disconnect();
      io.disconnect();
    };
  }, [pathname]);
}
