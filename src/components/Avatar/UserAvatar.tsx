import Gravatar from "../Avatar/Gravatar";

export interface UserAvatarProps {
  avatarId: string;
  userEmail: string;
  size?: "sm" | "md" | "lg";
}

const UserAvatar = ({ avatarId, userEmail, size = "md" }: UserAvatarProps) => {
  return avatarId === "gravatar" ? (
    <Gravatar email={userEmail} size={size} alt="User Gravatar" />
  ) : (
    <img
      src={`/assets/avatars/${avatarId}.svg`}
      alt="Selected Avatar"
      className={`rounded-full ${
        size === "lg" ? "w-24 h-24" : size === "md" ? "w-10 h-10" : "w-8 h-8"
      }`}
    />
  );
};

export default UserAvatar;
