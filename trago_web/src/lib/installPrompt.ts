/**
 * Captura early de beforeinstallprompt — si el evento llega antes
 * de montar el banner, sin esto se pierde y solo queda “usa el menú”.
 */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Listener = (ev: BeforeInstallPromptEvent | null) => void;

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<Listener>();
let hooked = false;

function emit() {
  for (const fn of listeners) fn(deferred);
}

export function getDeferredInstall(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function subscribeInstallPrompt(fn: Listener) {
  listeners.add(fn);
  fn(deferred);
  return () => {
    listeners.delete(fn);
  };
}

export function clearDeferredInstall() {
  deferred = null;
  emit();
}

export function hookInstallPromptEarly() {
  if (typeof window === 'undefined' || hooked) return;
  hooked = true;

  window.addEventListener('beforeinstallprompt', ((e: Event) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  }) as EventListener);

  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}
