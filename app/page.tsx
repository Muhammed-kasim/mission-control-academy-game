import { MissionControlGame } from '@/components/mission-control-game'
import { PwaRegister } from '@/components/pwa-register'
import { GameAudioProvider } from '@/components/game-audio'

export default function Page() {
  return <GameAudioProvider><PwaRegister /><MissionControlGame /></GameAudioProvider>
}
