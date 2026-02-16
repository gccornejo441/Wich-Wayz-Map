export interface TrackProps {
  version: string;
  variant?: string;
  locale: string;
  isAuthenticated: boolean;
  route: string;
  timestamp: number;
  dismissMethod?: "primary" | "close" | "esc" | "outside";
  snoozeDays?: number;
  destination?: string;
}

export const track = (eventName: string, props: TrackProps): void => {
  // No-op implementation - ready for analytics integration
  void eventName;
  void props;
};
