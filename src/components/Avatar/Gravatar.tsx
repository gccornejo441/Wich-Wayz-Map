import { Avatar } from "flowbite-react";
import generateGravatarUrl from "./generateGravatarUrl";
export interface GravatarProps {
  email: string;
  size?: number;
  rating?: "g" | "pg" | "r" | "x";
  defaultImage?:
    | "404"
    | "mp"
    | "identicon"
    | "monsterid"
    | "wavatar"
    | "retro"
    | "robohash"
    | "blank";
  alt?: string;
}

export interface GravatarAvatarProps extends Omit<GravatarProps, "size"> {
  alt?: string;
  bordered?: boolean;
  color?: "gray" | "red" | "yellow" | "green" | "blue" | "purple" | "pink";
  rounded?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  stacked?: boolean;
  status?: "away" | "busy" | "offline" | "online";
  statusPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  placeholderInitials?: string;
}

const Gravatar = ({
  email,
  alt = "User Avatar",
  bordered = false,
  color = "gray",
  rounded = true,
  size = "sm",
  stacked = false,
  status,
  statusPosition = "bottom-right",
  placeholderInitials,
  rating = "g",
  defaultImage = "mp",
}: GravatarAvatarProps) => {
  const gravatarUrl = generateGravatarUrl(
    email,
    size === "lg" ? 128 : 50,
    rating,
    defaultImage,
  );

  return (
    <Avatar
      img={gravatarUrl}
      alt={alt}
      bordered={bordered}
      color={color}
      rounded={rounded}
      size={size}
      stacked={stacked}
      status={status}
      statusPosition={statusPosition}
      placeholderInitials={placeholderInitials}
    />
  );
};

export default Gravatar;
