import { action, computed, makeObservable, observable } from 'mobx';
import { v4 as uuidV4 } from 'uuid';

const debug = require('../../preload-safe-debug')(
  'Ferdium:feature:notificationCenter',
);

export interface IPendingNotification {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  body: string;
  timestamp: number;
  isRead: boolean;
}

export const NOTIFICATION_CENTER_STORAGE_KEY = 'ferdium.notificationCenter';
export const MAX_STORED_NOTIFICATIONS = 200;

export class NotificationCenterStore {
  @observable notifications: IPendingNotification[] = [];

  @observable isPanelVisible: boolean = false;

  constructor() {
    makeObservable(this);
    this.load();
  }

  @computed get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  @action add(data: Omit<IPendingNotification, 'id' | 'timestamp' | 'isRead'>) {
    this.notifications.unshift({
      ...data,
      id: uuidV4(),
      timestamp: Date.now(),
      isRead: false,
    });

    if (this.notifications.length > MAX_STORED_NOTIFICATIONS) {
      this.notifications.length = MAX_STORED_NOTIFICATIONS;
    }

    this.save();
  }

  @action markRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      this.save();
    }
  }

  @action markServiceRead(serviceId: string) {
    let changed = false;
    for (const notification of this.notifications) {
      if (notification.serviceId === serviceId && !notification.isRead) {
        notification.isRead = true;
        changed = true;
      }
    }

    if (changed) this.save();
  }

  @action markAllRead() {
    let changed = false;
    for (const notification of this.notifications) {
      if (!notification.isRead) {
        notification.isRead = true;
        changed = true;
      }
    }

    if (changed) this.save();
  }

  @action clearRead() {
    this.notifications = this.notifications.filter(n => !n.isRead);
    this.save();
  }

  @action togglePanel() {
    this.isPanelVisible = !this.isPanelVisible;
  }

  @action closePanel() {
    this.isPanelVisible = false;
  }

  private load() {
    if (typeof localStorage === 'undefined') return;

    try {
      const raw = localStorage.getItem(NOTIFICATION_CENTER_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.notifications = parsed.slice(0, MAX_STORED_NOTIFICATIONS);
      }
    } catch (error) {
      debug('Could not restore stored notifications', error);
    }
  }

  private save() {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(
        NOTIFICATION_CENTER_STORAGE_KEY,
        JSON.stringify(this.notifications),
      );
    } catch (error) {
      debug('Could not persist notifications', error);
    }
  }
}

export const notificationCenterStore = new NotificationCenterStore();
