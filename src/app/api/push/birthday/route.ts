import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canOperatePanel } from "@/lib/panel-auth";
import { birthDateIso, isBirthdayToday } from "@/lib/night";
import {
  deletePushSubscription,
  listAdultUsers,
  listPushSubsForUserIds,
} from "@/lib/queries";
import { sendPush, vapidConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request, session: Awaited<ReturnType<typeof getSession>>) {
  const cron = process.env.CRON_SECRET;
  if (cron && request.headers.get("x-cron-secret") === cron) return true;
  return canOperatePanel(session);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!authorized(request, session)) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }
  if (!vapidConfigured()) {
    return NextResponse.json({ error: "VAPID no configurado." }, { status: 503 });
  }

  const users = await listAdultUsers();
  const birthdayUsers = users.filter((u) => {
    const iso = birthDateIso(u.age.birthDate);
    return isBirthdayToday(iso);
  });
  if (birthdayUsers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, users: 0 });
  }

  const byId = new Map(birthdayUsers.map((u) => [String(u._id), u]));
  const subs = await listPushSubsForUserIds([...byId.keys()]);
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const user = byId.get(sub.userId);
    if (!user) continue;
    try {
      await sendPush(sub, {
        title: "Feliz cumpleaños — TraGo",
        body: `${user.profile.name}, hoy te regalan algo cerca. Abre Cumple.`,
        url: "/cumple",
        tag: "trago-birthday",
      });
      sent += 1;
    } catch (err) {
      failed += 1;
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await deletePushSubscription(sub.endpoint);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    users: birthdayUsers.length,
    subscriptions: subs.length,
    sent,
    failed,
  });
}
