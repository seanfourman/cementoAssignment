import { useEffect, useRef } from "react";
import { Copy, PanelRightOpen, Pin, PinOff, Trash2 } from "lucide-react";

type Props = {
  x: number;
  y: number;
  isPinned: boolean;
  showDetails: boolean;
  onPin: () => void;
  onDetails: () => void;
  onCopyJson: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function RowContextMenu({
  x,
  y,
  isPinned,
  showDetails,
  onPin,
  onDetails,
  onCopyJson,
  onDelete,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const handleScroll = () => onClose();

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - 200);
  const top = Math.min(y, window.innerHeight - (showDetails ? 172 : 132));

  return (
    <div
      className="row-context-menu"
      ref={menuRef}
      role="menu"
      style={{ left, top }}
    >
      <button
        className="context-menu-item"
        onClick={() => {
          onPin();
          onClose();
        }}
        role="menuitem"
        type="button"
      >
        {isPinned ? (
          <PinOff size={15} aria-hidden="true" />
        ) : (
          <Pin size={15} aria-hidden="true" />
        )}
        {isPinned ? "Unpin row" : "Pin row"}
      </button>

      {showDetails && (
        <button
          className="context-menu-item"
          onClick={() => {
            onDetails();
            onClose();
          }}
          role="menuitem"
          type="button"
        >
          <PanelRightOpen size={15} aria-hidden="true" />
          View details
        </button>
      )}

      <div className="context-menu-divider" />

      <button
        className="context-menu-item"
        onClick={() => {
          onCopyJson();
          onClose();
        }}
        role="menuitem"
        type="button"
      >
        <Copy size={15} aria-hidden="true" />
        Copy as JSON
      </button>

      <div className="context-menu-divider" />

      <button
        className="context-menu-item context-menu-item--danger"
        onClick={() => {
          onDelete();
          onClose();
        }}
        role="menuitem"
        type="button"
      >
        <Trash2 size={15} aria-hidden="true" />
        Delete row
      </button>
    </div>
  );
}
