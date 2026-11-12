export const CATEGORIES = ["travel", "meals", "lodging", "supplies", "other"] as const;
export type Category = (typeof CATEGORIES)[number];
