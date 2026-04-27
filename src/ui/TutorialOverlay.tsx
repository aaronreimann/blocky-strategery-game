import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { THEME } from './palette';

type Props = {
  onClose: () => void;
};

type Tip = { title: string; body: string };

const TIPS: Tip[] = [
  {
    title: 'Settle a city',
    body:
      'Tap your Wayfarer to select it, walk it to a green tile, then long-press to open its menu and pick "Settle". Your first city anchors your realm.',
  },
  {
    title: 'Move and fight',
    body:
      'Tap any unit to select it. Yellow tiles are valid moves; red tiles have an enemy you can attack. Drag from a selected unit to set a long-range destination.',
  },
  {
    title: 'Build in cities',
    body:
      'Tap one of your cities to choose what to produce. Tap a build option once to set it as the current build, or long-press to add it to the queue.',
  },
  {
    title: 'Serfs improve land',
    body:
      'Toggle a Serf to auto (the "A" badge) and it will irrigate grasslands, mine hills, and lay roads inside your borders — no babysitting required.',
  },
  {
    title: 'Research',
    body:
      'Each new turn banks science toward the cheapest available tech automatically. Tap the flask pill at the top to override and pick a different one.',
  },
  {
    title: 'Goody huts',
    body:
      'Brown mushroom-house tiles are abandoned villages. Walk any unit onto one to claim a reward — gold, science, a free tech, or a new soldier.',
  },
  {
    title: 'How to win',
    body:
      'Capture every enemy capital, or be the first to research Philosophy. Lose all your cities and your realm falls.',
  },
];

export default function TutorialOverlay({ onClose }: Props) {
  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Welcome to Blocky Strategery</Text>
            <Text style={styles.subtitle}>How to play</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
        >
          {TIPS.map((tip, i) => (
            <View key={i} style={styles.tip}>
              <Text style={styles.tipTitle}>
                {i + 1}. {tip.title}
              </Text>
              <Text style={styles.tipBody}>{tip.body}</Text>
            </View>
          ))}
          <Text style={styles.footnote}>
            You can reopen this guide anytime from the book pill at the top of
            the HUD.
          </Text>
        </ScrollView>
        <Pressable style={styles.gotIt} onPress={onClose}>
          <Text style={styles.gotItText}>Got it</Text>
        </Pressable>
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
  subtitle: { color: THEME.inkMuted, fontSize: 12, marginTop: 4 },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderColor: THEME.border,
    borderWidth: 1,
  },
  closeText: { color: THEME.ink, fontSize: 12, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 12 },
  tip: {
    backgroundColor: 'rgba(10, 23, 41, 0.6)',
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  tipTitle: { color: THEME.warn, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  tipBody: { color: THEME.ink, fontSize: 13, lineHeight: 18 },
  footnote: {
    color: THEME.inkMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  gotIt: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: THEME.warn,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  gotItText: { color: '#0a1729', fontSize: 15, fontWeight: '800' },
});
