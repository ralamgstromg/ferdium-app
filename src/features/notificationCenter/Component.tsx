import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import withStyles, { type WithStylesProps } from 'react-jss';
import type { StoresProps } from '../../@types/ferdium-components.types';
import Modal from '../../components/ui/Modal';
import { H1 } from '../../components/ui/headline';
import { notificationCenterStore } from './store';

const messages = defineMessages({
  title: {
    id: 'feature.notificationCenter.title',
    defaultMessage: 'Pending notifications',
  },
  empty: {
    id: 'feature.notificationCenter.empty',
    defaultMessage: 'No notifications to review.',
  },
  markAllRead: {
    id: 'feature.notificationCenter.markAllRead',
    defaultMessage: 'Mark all as read',
  },
  clearRead: {
    id: 'feature.notificationCenter.clearRead',
    defaultMessage: 'Clear read',
  },
  markRead: {
    id: 'feature.notificationCenter.markRead',
    defaultMessage: 'Mark as read',
  },
});

const styles = theme => ({
  modal: {
    width: '80%',
    maxWidth: 640,
    background: theme.styleTypes.primary.contrast,
    paddingTop: 30,
  },
  headline: {
    fontSize: 20,
    marginBottom: 12,
    marginTop: -27,
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    background: 'none',
    border: `1px solid ${theme.styleTypes.primary.accent}`,
    borderRadius: 6,
    color: theme.styleTypes.primary.accent,
    cursor: 'pointer',
    padding: '4px 10px',
  },
  list: {
    maxHeight: '55vh',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  empty: {
    color: theme.colorText,
    opacity: 0.7,
    padding: '20px 0',
    textAlign: 'center',
  },
  item: {
    alignItems: 'center',
    borderRadius: 6,
    color: theme.colorText,
    display: 'flex',
    gap: 10,
    marginBottom: 6,
    padding: '6px 10px',
    '&:hover': {
      background: theme.colorBackground,
    },
  },
  unread: {
    fontWeight: 'bold',
  },
  itemMain: {
    alignItems: 'center',
    background: 'none',
    border: 0,
    color: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    flex: 1,
    font: 'inherit',
    gap: 10,
    minWidth: 0,
    padding: 0,
    textAlign: 'left',
  },
  icon: {
    flexShrink: 0,
    height: 32,
    objectFit: 'contain',
    width: 32,
  },
  text: {
    minWidth: 0,
  },
  line: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    fontSize: 12,
    opacity: 0.7,
  },
  dot: {
    background: theme.styleTypes.primary.accent,
    borderRadius: '50%',
    flexShrink: 0,
    height: 8,
    width: 8,
  },
});

interface IProps
  extends WithStylesProps<typeof styles>,
    Partial<StoresProps>,
    WrappedComponentProps {}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
});

@inject('stores', 'actions')
@observer
class NotificationCenterPanel extends Component<IProps> {
  openNotification(id: string, serviceId: string) {
    const { actions } = this.props;

    notificationCenterStore.markRead(id);
    notificationCenterStore.closePanel();

    if (actions!.service && this.serviceExists(serviceId)) {
      actions!.service.setActive({ serviceId });
    }
  }

  serviceExists(serviceId: string): boolean {
    return this.props.stores!.services.all.some(s => s.id === serviceId);
  }

  serviceIcon(serviceId: string): string | undefined {
    return this.props.stores!.services.all.find(s => s.id === serviceId)?.icon;
  }

  render(): ReactElement {
    const { classes, intl } = this.props;
    const { notifications, isPanelVisible, unreadCount } =
      notificationCenterStore;

    return (
      <Modal
        isOpen={isPanelVisible}
        className={`${classes.modal} notification-center`}
        shouldCloseOnOverlayClick
        close={() => notificationCenterStore.closePanel()}
      >
        <H1 className={classes.headline}>
          {intl.formatMessage(messages.title)}
        </H1>
        <div className={classes.actions}>
          <button
            type="button"
            className={classes.actionButton}
            disabled={unreadCount === 0}
            onClick={() => notificationCenterStore.markAllRead()}
          >
            {intl.formatMessage(messages.markAllRead)}
          </button>
          <button
            type="button"
            className={classes.actionButton}
            onClick={() => notificationCenterStore.clearRead()}
          >
            {intl.formatMessage(messages.clearRead)}
          </button>
        </div>
        <div className={classes.list}>
          {notifications.length === 0 && (
            <p className={classes.empty}>
              {intl.formatMessage(messages.empty)}
            </p>
          )}
          {notifications.map(notification => {
            const icon = this.serviceIcon(notification.serviceId);

            return (
              <div
                key={notification.id}
                className={`${classes.item} ${
                  notification.isRead ? '' : classes.unread
                }`}
              >
                <button
                  type="button"
                  className={classes.itemMain}
                  onClick={() =>
                    this.openNotification(
                      notification.id,
                      notification.serviceId,
                    )
                  }
                >
                  {icon && <img className={classes.icon} src={icon} alt="" />}
                  <span className={classes.text}>
                    <span className={`${classes.line} ${classes.meta}`}>
                      {notification.serviceName} ·{' '}
                      {timeFormat.format(notification.timestamp)}
                    </span>
                    <span className={classes.line}>{notification.title}</span>
                    {notification.body && (
                      <span className={`${classes.line} ${classes.meta}`}>
                        {notification.body}
                      </span>
                    )}
                  </span>
                </button>
                {!notification.isRead && (
                  <>
                    <span className={classes.dot} />
                    <button
                      type="button"
                      className={classes.actionButton}
                      onClick={() =>
                        notificationCenterStore.markRead(notification.id)
                      }
                    >
                      {intl.formatMessage(messages.markRead)}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Modal>
    );
  }
}

export default injectIntl(
  withStyles(styles, { injectTheme: true })(NotificationCenterPanel),
);
