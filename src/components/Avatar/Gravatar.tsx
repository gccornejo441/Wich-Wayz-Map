import { Avatar } from "flowbite-react";
import generateGravatarUrl, {
  generateGravatarUrlFromHash,
} from "./generateGravatarUrl";
export interface GravatarProps {
  email?: string;
  hash?: string;
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
  hash,
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
  const pixelSize = size === "lg" ? 128 : 50;
  const gravatarUrl = hash
    ? generateGravatarUrlFromHash(hash, pixelSize, rating, defaultImage)
    : generateGravatarUrl(email ?? "", pixelSize, rating, defaultImage);

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
