import { useEffect, useState } from 'react';
import {
  getSubscription,
  needsIosInstall,
  pushErrorMessage,
  pushSupported,
  sendTestPush,
  subscribePush,
  unsubscribePush,
} from './pushSubscribe';

export type PushUiState =
  | 'checking'
  | 'unsupported'
  | 'login'
  | 'ios'
  | 'off'
  | 'on';

export function usePushNotifications(loggedIn: boolean) {
  const [state, setState] = useState<PushUiState>('checking');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!loggedIn) {
      setState('login');
      return;
    }
    if (needsIosInstall()) {
      setState('ios');
      return;
    }
    if (!pushSupported()) {
      setState('unsupported');
      return;
    }
    void getSubscription()
      .then((sub) => {
        if (!cancelled) setState(sub ? 'on' : 'off');
      })
      .catch(() => {
        if (!cancelled) setState('off');
      });
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  async function run(action: () => Promise<void>, next: PushUiState, ok: string) {
    setBusy(true);
    setNote('');
    try {
      await action();
      setState(next);
      setNote(ok);
    } catch (error) {
      setNote(pushErrorMessage(error, 'No se pudo completar la acción'));
    } finally {
      setBusy(false);
    }
  }

  function enable(ok: string) {
    return run(async () => {
      await subscribePush();
    }, 'on', ok);
  }

  function disable(ok: string) {
    return run(async () => {
      await unsubscribePush();
    }, 'off', ok);
  }

  function test(ok: string) {
    return run(async () => {
      await sendTestPush();
    }, 'on', ok);
  }

  return { state, busy, note, enable, disable, test };
}
