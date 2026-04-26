import { useGame } from '@/src/state/game';
import GameScreen from '@/src/ui/GameScreen';
import TitleScreen from '@/src/ui/TitleScreen';

export default function Home() {
  const inGame = useGame((s) => s.currentSlot !== null);
  return inGame ? <GameScreen /> : <TitleScreen />;
}
