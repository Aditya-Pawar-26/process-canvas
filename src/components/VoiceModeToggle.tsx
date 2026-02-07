import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProcessTreeContext } from '@/contexts/ProcessTreeContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const VoiceModeToggle = () => {
  const { voiceModeEnabled, setVoiceModeEnabled, stopSpeaking } = useProcessTreeContext();

  const handleToggle = () => {
    if (voiceModeEnabled) {
      stopSpeaking();
    }
    setVoiceModeEnabled(!voiceModeEnabled);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={voiceModeEnabled ? "default" : "ghost"}
            size="sm"
            onClick={handleToggle}
            className={cn(
              "gap-2 transition-all",
              voiceModeEnabled && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {voiceModeEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="hidden lg:inline">
              {voiceModeEnabled ? 'Voice On' : 'Voice Off'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{voiceModeEnabled ? 'Disable voice narration' : 'Enable voice narration'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
