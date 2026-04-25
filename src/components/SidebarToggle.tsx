import { PanelLeftClose, PanelLeftOpen, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarToggleProps {
  /** Whether the mobile drawer is currently open */
  mobileOpen: boolean;
  /** Toggle the mobile drawer */
  onMobileToggle: () => void;
  /** Whether the desktop sidebar is currently hidden */
  desktopHidden: boolean;
  /** Toggle the desktop sidebar visibility */
  onDesktopToggle: () => void;
}

export function SidebarToggle({
  mobileOpen,
  onMobileToggle,
  desktopHidden,
  onDesktopToggle,
}: SidebarToggleProps) {
  const isMobile = useIsMobile();

  const handleClick = () => {
    if (isMobile) onMobileToggle();
    else onDesktopToggle();
  };

  // Pick an icon that reflects current state
  const Icon = isMobile
    ? Menu
    : desktopHidden
      ? PanelLeftOpen
      : PanelLeftClose;

  const label = isMobile
    ? mobileOpen
      ? "Close menu"
      : "Open menu"
    : desktopHidden
      ? "Show sidebar"
      : "Hide sidebar";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          aria-label={label}
        >
          <Icon className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
