export type AppNotificationAudience = "customer" | "vendor" | "admin";

export type InAppNotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};
