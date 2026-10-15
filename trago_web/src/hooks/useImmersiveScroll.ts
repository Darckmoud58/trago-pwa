import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Atmósfera de scroll: clase is-scrolled en el shell + revelado de
 * elementos [data-reveal] / .scroll-reveal al entrar en viewport.
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

    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal], .scroll-reveal')
    );
    if (nodes.length === 0) return;

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
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.12,
      }
    );

    // Micro-delay: deja que PageTransition monte el DOM nuevo
    const id = window.setTimeout(() => {
      nodes.forEach((el) => {
        if (!el.classList.contains('scroll-reveal')) {
          el.classList.add('scroll-reveal');
        }
        io.observe(el);
      });
    }, 40);

    // Fallback: nada debe quedar invisible si el IO no dispara
    const safety = window.setTimeout(() => {
      nodes.forEach((el) => el.classList.add('is-inview'));
    }, 1800);

    return () => {
      window.clearTimeout(id);
      window.clearTimeout(safety);
      io.disconnect();
    };
  }, [pathname]);
}
