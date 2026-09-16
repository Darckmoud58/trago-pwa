"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);
  const [help, setHelp] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const dismissed = sessionStorage.getItem("trago-install-hide") === "1";
    if (!dismissed) setHidden(false);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden) return null;

  async function install() {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") {
          setHidden(true);
          sessionStorage.setItem("trago-install-hide", "1");
        }
      } catch {
        setNote("Chrome no abrió el diálogo. Mira la barra de dirección o el menú ⋮.");
        setHelp(true);
      }
      return;
    }
    setHelp(true);
    setNote(
      isIos()
        ? "En iPhone usa Safari (no Chrome): Compartir → Añadir a pantalla de inicio."
        : "En Chrome el ítem no siempre dice “Instalar TraGo”. Busca el icono ⊕ en la barra de dirección o Cast, save and share.",
    );
  }

  return (
    <div
      id="instalar"
      className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-lg border border-[var(--copper)]/40 bg-[#0e1a16]/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,.45)] backdrop-blur-md md:bottom-6"
    >
      <p className="font-display text-lg text-[var(--foam)]">Instala TraGo</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        App en el inicio del celular, sin tienda. Mejor en Chrome, Edge o Safari (iPhone).
      </p>
      {note && <p className="mt-2 text-sm text-[var(--gold)]">{note}</p>}
      {help && !isIos() && (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
          <li>Abre http://localhost:3000 en Chrome de escritorio o Android (ventana normal, no Cursor).</li>
          <li>
            Mira la barra de dirección: icono de instalar (monitor/⊕). Si no, menú ⋮ →{" "}
            <em>Cast, save and share</em> / <em>Guardar y compartir</em> → Instalar página / Instalar TraGo.
          </li>
          <li>No uses modo incógnito. Recarga una vez para que el service worker quede activo.</li>
          <li>iPhone: solo Safari → Compartir → Añadir a pantalla de inicio.</li>
        </ol>
      )}
      {help && isIos() && (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
          <li>Abre TraGo en Safari (Chrome en iOS no instala PWA bien).</li>
          <li>Botón Compartir → Añadir a pantalla de inicio.</li>
        </ol>
      )}
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          className="bg-[var(--copper)] px-4 py-2 text-sm font-semibold text-[#1a1008]"
          onClick={install}
        >
          {deferred ? "Instalar" : "Cómo instalar"}
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm text-[var(--muted)]"
          onClick={() => {
            setHidden(true);
            sessionStorage.setItem("trago-install-hide", "1");
          }}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
