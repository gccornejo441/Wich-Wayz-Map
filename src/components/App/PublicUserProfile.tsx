import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiBookmark, FiMessageCircle, FiStar, FiUser } from "react-icons/fi";
import { GiSandwich } from "react-icons/gi";
import UserAvatar from "@components/Avatar/UserAvatar";
import { getPublicUserProfile } from "@services/publicProfileService";
import { PublicUserProfile as PublicUserProfileModel } from "@models/PublicUserProfile";

const formatMemberSince = (value: string | null) => {
  if (!value) return "Member";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Member";

  return `Member since ${date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  })}`;
};

const PublicUserProfile = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState<PublicUserProfileModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const requestedUsername = username?.trim();
      if (!requestedUsername) {
        setError("Profile not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getPublicUserProfile(requestedUsername);
        setProfile(data);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError("Profile not found or private.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  const stats = useMemo(() => {
    if (!profile) return [];

    return [
      {
        icon: <GiSandwich />,
        label: "Shops Added",
        value: profile.shopCount,
      },
      {
        icon: <FiMessageCircle />,
        label: "Comments",
        value: profile.commentCount,
      },
      {
        icon: <FiBookmark />,
        label: "Public Lists",
        value: profile.publicCollections.length,
      },
    ];
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-[60vh] pt-20 flex items-center justify-center">
        <GiSandwich className="animate-spin text-[50px] text-brand-primary dark:text-brand-secondary mr-4" />
        <span className="text-brand-primary dark:text-brand-secondary text-md font-semibold">
          Loading profile...
        </span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto mt-20 mb-8 bg-white dark:bg-surface-dark rounded-lg shadow-card border border-surface-muted dark:border-gray-700 p-6 text-center">
        <FiUser className="mx-auto mb-3 text-3xl text-text-muted dark:text-text-inverted/70" />
        <p className="text-lg font-semibold text-text-base dark:text-text-inverted">
          {error ?? "Profile unavailable"}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pt-20 pb-6 px-4 space-y-6">
      <section className="bg-white dark:bg-surface-dark rounded-lg shadow-card border border-surface-muted dark:border-gray-700 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <UserAvatar
            avatarId={profile.avatar || "default"}
            avatarHash={profile.avatarHash}
            size="lg"
          />

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-text-base dark:text-text-inverted break-words">
              {profile.username}
            </h1>
            <p className="text-sm text-text-muted dark:text-text-inverted/70">
              {formatMemberSince(profile.dateCreated)}
            </p>
            {profile.bio && (
              <p className="mt-3 text-sm leading-6 text-text-base dark:text-text-inverted">
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-surface-dark rounded-lg shadow-card border border-surface-muted dark:border-gray-700 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                {stat.icon}
              </div>
              <div>
                <div className="text-2xl font-bold text-text-base dark:text-text-inverted">
                  {stat.value}
                </div>
                <div className="text-xs text-text-muted dark:text-text-inverted/70">
                  {stat.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-dark rounded-lg shadow-card border border-surface-muted dark:border-gray-700 p-4 space-y-4">
          <h2 className="text-lg font-semibold text-text-base dark:text-text-inverted">
            Sandwich Profile
          </h2>

          <div>
            <div className="text-xs uppercase text-text-muted dark:text-text-inverted/60">
              Favorite Sandwich
            </div>
            <div className="mt-1 text-sm text-text-base dark:text-text-inverted">
              {profile.favoriteSandwich || "Not shared yet"}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-text-muted dark:text-text-inverted/60">
              Favorite Restaurant
            </div>
            <div className="mt-1 text-sm text-text-base dark:text-text-inverted">
              {profile.favoriteShop?.name || "Not shared yet"}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-lg shadow-card border border-surface-muted dark:border-gray-700 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-text-base dark:text-text-inverted">
              Public Lists
            </h2>
            <FiStar className="text-brand-secondary" />
          </div>

          {profile.publicCollections.length === 0 ? (
            <p className="text-sm text-text-muted dark:text-text-inverted/70">
              No public lists yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.publicCollections.map((collection) => (
                <Link
                  key={collection.id}
                  to={`/lists/${collection.id}`}
                  className="block rounded-lg border border-surface-muted dark:border-gray-700 p-3 hover:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                >
                  <div className="font-semibold text-text-base dark:text-text-inverted">
                    {collection.name}
                  </div>
                  {collection.description && (
                    <p className="mt-1 text-sm text-text-muted dark:text-text-inverted/70 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-text-muted dark:text-text-inverted/70">
                    {collection.shopCount ?? 0} shops
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PublicUserProfile;
