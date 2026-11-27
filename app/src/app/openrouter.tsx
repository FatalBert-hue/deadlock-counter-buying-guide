// OpenRouter sign-in callback — the screen OpenRouter redirects to
// (dcb://openrouter?code=...&state=...) after the user authorizes
// DCB on openrouter.ai.
//
// This screen exists for two reasons. First, Expo Router routes the
// dcb://openrouter deep link here, so without it the user would land
// on the "Unmatched Route" screen. Second, it is the backup for the
// Settings sign-in button: if the browser session does not hand the
// code back to Settings directly, this screen completes the exchange
// itself. The exchange is safe to run from either place — the
// pending verifier is consumed on first use, so the second attempt
// is a harmless "already signed in".
//
// The exchanged key is stored in SecureStore exactly like a pasted
// key, and the AI chat works with it immediately — no restart, no
// extra step.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { completeOpenRouterSignIn } from '@/ai/openrouter-auth';
import { useSettings } from '@/state/settings';

type Status = { kind: 'working' } | { kind: 'done'; message: string } | { kind: 'error'; message: string };

function param(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

export default function OpenRouterCallbackScreen() {
  const { palette } = useSettings();
  const params = useLocalSearchParams();
  const code = param(params.code);
  const state = param(params.state);
  const error = param(params.error);

  // The no-code / denied cases are decided during render, not in an
  // effect — calling setState synchronously inside an effect is a
  // lint error (react-hooks/set-state-in-effect). Only the async
  // exchange runs in the effect below.
  const [status, setStatus] = useState<Status>(() => {
    if (error) {
      return {
        kind: 'error',
        message: 'Sign-in was cancelled — you can paste an OpenRouter key in Settings instead.',
      };
    }
    if (!code) {
      return { kind: 'error', message: 'Nothing to sign in here — start from Settings.' };
    }
    return { kind: 'working' };
  });

  useEffect(() => {
    if (!code) return;
    let alive = true;
    completeOpenRouterSignIn(code, state)
      .then(() => {
        if (alive) {
          setStatus({
            kind: 'done',
            message: 'Signed in with OpenRouter — your key is saved on this phone and the AI chat is ready.',
          });
        }
      })
      .catch((e) => {
        if (alive) {
          setStatus({
            kind: 'error',
            message: e instanceof Error ? e.message : 'Sign-in failed — try again from Settings.',
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [code, state]);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <Text style={[styles.title, { color: palette.ink }]}>OpenRouter sign-in</Text>
      {status.kind === 'working' ? (
        <Text style={[styles.body, { color: palette.muted }]}>Finishing sign-in…</Text>
      ) : (
        <Text style={[styles.body, { color: status.kind === 'done' ? palette.good : palette.enemy }]}>
          {status.message}
        </Text>
      )}
      {status.kind !== 'working' ? (
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Back to the guide"
          style={[styles.button, { backgroundColor: palette.panel }]}>
          <Text style={[styles.buttonText, { color: palette.ink }]}>Back to the guide</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  button: {
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
