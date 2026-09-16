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
    if (Notification.permission !== "granted") return;

    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(KEY) === today) return;

    new Notification("Feliz cumpleaños — TraGo", {
      body: `${user.name}, hay lugares en Guadalajara que hoy te regalan algo. Ábrelo en Cumple.`,
      icon: "/icon.svg",
      tag: "trago-birthday",
    });
    localStorage.setItem(KEY, today);
  }, [user]);

  return null;
}
