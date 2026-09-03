"use client";

import { useEffect } from "react";
import { isBirthdayToday } from "@/lib/night";
import { useSession } from "./SessionProvider";

const KEY = "trago-birthday-push";

export function BirthdayNotifier() {
  const user = useSession();

  useEffect(() => {
    if (!user?.birthDate || !isBirthdayToday(user.birthDate)) return;
    if (!("Notification" in window)) return;

    const today = new Date().toISOString().slice(0, 10);
    const sent = localStorage.getItem(KEY);
    if (sent === today) return;

    const notify = () => {
      new Notification("Feliz cumpleaños — TraGo", {
        body: `${user.name}, hay lugares en Guadalajara que hoy te regalan algo. Ábrelo en Cumple.`,
        icon: "/icon.svg",
        tag: "trago-birthday",
      });
      localStorage.setItem(KEY, today);
    };

    if (Notification.permission === "granted") {
      notify();
      return;
    }
    if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") notify();
      });
    }
  }, [user]);

  return null;
}
