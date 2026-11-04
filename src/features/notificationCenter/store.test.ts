import { MAX_STORED_NOTIFICATIONS, NotificationCenterStore } from './store';

const sample = (serviceId: string, title = 'Hi') => ({
  serviceId,
  serviceName: serviceId.toUpperCase(),
  title,
  body: '',
});

describe('NotificationCenterStore', () => {
  it('stores new notifications as unread, newest first', () => {
    const store = new NotificationCenterStore();
    store.notifications = [];

    store.add(sample('a', 'first'));
    store.add(sample('b', 'second'));

    expect(store.notifications.map(n => n.title)).toEqual(['second', 'first']);
    expect(store.unreadCount).toBe(2);
  });

  it('marks one, a whole service, or everything as read', () => {
    const store = new NotificationCenterStore();
    store.notifications = [];
    store.add(sample('a'));
    store.add(sample('a'));
    store.add(sample('b'));

    store.markRead(store.notifications.find(n => n.serviceId === 'a')!.id);
    expect(store.unreadCount).toBe(2);

    store.markServiceRead('a');
    expect(store.unreadCount).toBe(1);

    store.markAllRead();
    expect(store.unreadCount).toBe(0);
  });

  it('clears only read notifications', () => {
    const store = new NotificationCenterStore();
    store.notifications = [];
    store.add(sample('a'));
    store.add(sample('b'));
    store.markServiceRead('a');

    store.clearRead();

    expect(store.notifications.map(n => n.serviceId)).toEqual(['b']);
  });

  it('caps the stored history', () => {
    const store = new NotificationCenterStore();
    store.notifications = [];

    for (let i = 0; i < MAX_STORED_NOTIFICATIONS + 10; i += 1) {
      store.add(sample('a', String(i)));
    }

    expect(store.notifications).toHaveLength(MAX_STORED_NOTIFICATIONS);
    expect(store.notifications[0].title).toBe(
      String(MAX_STORED_NOTIFICATIONS + 9),
    );
  });
});
