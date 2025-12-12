import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHighContrastMode } from "@/hooks/useHighContrastMode";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const HighContrastToggle = () => {
  const { isHighContrast, toggleHighContrast } = useHighContrastMode();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleHighContrast}
            className="h-8 w-8"
            aria-label={isHighContrast ? "Disable high contrast mode" : "Enable high contrast mode"}
            aria-pressed={isHighContrast}
          >
            {isHighContrast ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isHighContrast ? "Disable" : "Enable"} High Contrast</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
