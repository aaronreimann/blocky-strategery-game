import Constants from 'expo-constants';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resetTutorial, wipeAllAppData } from '@/src/state/saves';

import { THEME } from './palette';

type Props = {
  onClose: () => void;
  onAfterReset: () => void;
};

const APP_VERSION =
  (Constants.expoConfig?.version as string | undefined) ?? '0.0.0';

export default function SettingsScreen({ onClose, onAfterReset }: Props) {
  const [confirmingWipe, setConfirmingWipe] = useState(false);
  const [tutorialReset, setTutorialReset] = useState(false);
  const [wiped, setWiped] = useState(false);

  const handleResetTutorial = async () => {
    await resetTutorial();
    setTutorialReset(true);
  };

  const handleWipeAll = async () => {
    await wipeAllAppData();
    setWiped(true);
    setConfirmingWipe(false);
    onAfterReset();
  };

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tutorial</Text>
            <Text style={styles.sectionBody}>
              Show the welcome guide again the next time the game opens.
            </Text>
            <Pressable
              style={[styles.btn, tutorialReset && styles.btnDone]}
              onPress={handleResetTutorial}
              disabled={tutorialReset}
            >
              <Text style={styles.btnText}>
                {tutorialReset ? 'Tutorial reset' : 'Reset tutorial'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reset all data</Text>
            <Text style={styles.sectionBody}>
              Removes every save slot, your history log, the tutorial-seen
              flag, and any cached data. Cannot be undone.
            </Text>
            {wiped ? (
              <View style={[styles.btn, styles.btnDone]}>
                <Text style={styles.btnText}>All data wiped</Text>
              </View>
            ) : confirmingWipe ? (
              <View style={styles.confirmRow}>
                <Pressable
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => setConfirmingWipe(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnDanger]}
                  onPress={handleWipeAll}
                >
                  <Text style={[styles.btnText, styles.btnDangerText]}>
                    Yes, wipe everything
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.btn, styles.btnDangerOutline]}
                onPress={() => setConfirmingWipe(true)}
              >
                <Text style={[styles.btnText, styles.btnDangerOutlineText]}>
                  Wipe all app data…
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.sectionBody}>Blocky Strategery v{APP_VERSION}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28, 22, 18, 0.97)',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: { color: THEME.ink, fontSize: 22, fontWeight: '900' },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  closeText: { color: THEME.ink, fontSize: 12, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { gap: 16, paddingBottom: 12 },
  section: {
    backgroundColor: 'rgba(45, 32, 22, 0.85)',
    borderColor: 'rgba(212, 184, 138, 0.45)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  sectionTitle: {
    color: THEME.warn,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionBody: {
    color: THEME.ink,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    backgroundColor: 'rgba(10, 23, 41, 0.45)',
  },
  btnDone: { opacity: 0.5 },
  btnGhost: {
    flex: 1,
    backgroundColor: 'rgba(10, 23, 41, 0.45)',
  },
  btnDangerOutline: { borderColor: THEME.bad },
  btnDangerOutlineText: { color: THEME.bad },
  btnDanger: {
    flex: 1,
    backgroundColor: THEME.bad,
    borderColor: THEME.bad,
  },
  btnDangerText: { color: '#0a1729', fontWeight: '900' },
  btnText: { color: THEME.ink, fontSize: 13, fontWeight: '700' },
  confirmRow: { flexDirection: 'row', gap: 10 },
});
