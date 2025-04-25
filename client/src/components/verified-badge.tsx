import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function VerifiedBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        This provider has been verified by our team
      </TooltipContent>
    </Tooltip>
  );
}
