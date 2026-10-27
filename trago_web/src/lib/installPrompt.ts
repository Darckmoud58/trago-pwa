/**
 * Igual que Todo: el listener vive al importar este módulo, antes del resto
 * de la app. Si beforeinstallprompt se pierde, el botón ya no puede instalar.
 */
import { useSyncExternalStore } from 'react';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Listener = () => void;

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export function getDeferredInstall(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function subscribeInstallPrompt(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function clearDeferredInstall() {
  deferred = null;
  emit();
}

/** Hay que llamarlo en el clic, sin awaits previos: si no, Chrome rechaza el diálogo. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | null> {
  const event = deferred;
  if (!event) return null;
  await event.prompt();
  const choice = await event.userChoice;
  deferred = null;
  emit();
  return choice.outcome;
}

export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(
    (cb) => subscribeInstallPrompt(cb),
    () => deferred !== null,
    () => false
  );
  return { canInstall, install: promptInstall };
}
