import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  GitFork, 
  Clock, 
  XCircle, 
  RotateCcw,
  Play,
  Pause
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ControlPanelProps {
  onFork: () => void;
  onWait: () => void;
  onKill: () => void;
  onReset: () => void;
  forkDepth: number;
  setForkDepth: (depth: number) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  hasSelection: boolean;
  canWait: boolean;
  canKill: boolean;
  isStepMode?: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}

export const ControlPanel = ({
  onFork,
  onWait,
  onKill,
  onReset,
  forkDepth,
  setForkDepth,
  speed,
  setSpeed,
  hasSelection,
  canWait,
  canKill,
  isStepMode,
  isPlaying,
  onTogglePlay,
}: ControlPanelProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          Process Controls
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onFork}
                className="w-full gap-2 bg-process-running/20 hover:bg-process-running/30 text-process-running border border-process-running/50"
                variant="outline"
              >
                <GitFork className="w-4 h-4" />
                Fork
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Fork a new child process (F)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onWait}
                disabled={!canWait}
                className="w-full gap-2 bg-process-waiting/20 hover:bg-process-waiting/30 text-process-waiting border border-process-waiting/50 disabled:opacity-50"
                variant="outline"
              >
                <Clock className="w-4 h-4" />
                Wait
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Wait for child processes (W)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onKill()}
                disabled={!canKill}
                className="w-full gap-2 bg-process-zombie/20 hover:bg-process-zombie/30 text-process-zombie border border-process-zombie/50 disabled:opacity-50"
                variant="outline"
              >
                <XCircle className="w-4 h-4" />
                Exit
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Exit/Kill process (X)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onReset}
                variant="outline"
                className="w-full gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset entire tree</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Separator className="bg-border" />

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex justify-between">
            <span>Fork Depth</span>
            <span className="font-mono">{forkDepth}</span>
          </label>
          <Slider
            value={[forkDepth]}
            onValueChange={(v) => setForkDepth(v[0])}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex justify-between">
            <span>Animation Speed</span>
            <span className="font-mono">{speed}ms</span>
          </label>
          <Slider
            value={[speed]}
            onValueChange={(v) => setSpeed(v[0])}
            min={200}
            max={7000}
            step={100}
            className="w-full"
          />
        </div>
      </div>

      {isStepMode && onTogglePlay && (
        <>
          <Separator className="bg-border" />
          <Button
            onClick={onTogglePlay}
            variant="outline"
            className="w-full gap-2"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Auto Play
              </>
            )}
          </Button>
        </>
      )}

      <Separator className="bg-border" />

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">State Legend</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-process-running" />
            <span>Running</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-process-waiting" />
            <span>Waiting</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-process-zombie" />
            <span>Zombie</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-process-orphan border border-dashed border-process-orphan" />
            <span>Orphan</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-process-terminated" />
            <span>Terminated</span>
          </div>
        </div>
      </div>
    </div>
  );
};
