import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useOverlay } from "@/context/overlayContext";
import { ReactNode, useMemo } from "react";

export interface BaseItemProps {
  onClick?: () => void;
  icon: ReactNode;
  text: string;
  disabled?: boolean;
  linkTo?: string;
  badge?: string;
  external?: boolean;
}

export const SidebarItem = ({
  onClick,
  icon,
  text,
  disabled,
  linkTo,
  badge,
  external,
}: BaseItemProps) => {
  const { close } = useOverlay();
  const location = useLocation();

  const resolvedLinkTo = useMemo(() => {
    if (!linkTo) return undefined;
    if (external) return linkTo;
    if (linkTo.includes("?")) return linkTo;
    if (linkTo === ROUTES.HOME && location.search) {
      return `${linkTo}${location.search}`;
    }
    return linkTo;
  }, [linkTo, external, location.search]);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }

    close("nav");
    onClick?.();
  };

  const content = (
    <div
      className={`relative flex items-center justify-between p-2 w-full rounded-lg ${
        disabled
          ? "bg-white/10 cursor-not-allowed"
          : "hover:bg-white/20 focus:ring-white/20 cursor-pointer"
      }`}
      onClick={handleClick}
    >
      <span className={`w-6 h-6 mr-3 ${disabled ? "opacity-50" : ""}`}>
        {icon}
      </span>
      <span
        className={`text-md font-light text-white dark:text-text-inverted ${
          disabled ? "opacity-50" : ""
        }`}
      >
        {text}
      </span>
      {badge && (
        <span className="absolute top-0 right-0 mt-1 mr-2 bg-brand-secondary text-gray-800 text-xs font-bold rounded px-1 cursor-pointer">
          {badge}
        </span>
      )}
    </div>
  );

  if (resolvedLinkTo) {
    return external ? (
      <a
        href={resolvedLinkTo}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full"
      >
        {content}
      </a>
    ) : (
      <Link to={resolvedLinkTo} className="w-full">
        {content}
      </Link>
    );
  }

  return <div className="w-full">{content}</div>;
};