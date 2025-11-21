import React, { Component } from 'react';
import PropTypes from 'prop-types';
import '../styles/style.scss';

const isClient = typeof window !== 'undefined';
let ua;
let cookie;

const expiredDateInUTC = (additionalDays) => {
  const expiredDate = new Date();

  expiredDate.setDate(expiredDate.getDate() + additionalDays);

  return expiredDate.toUTCString();
};

class SmartBanner extends Component {
  constructor(props) {
    super(props);

    if (!__SERVER__) {
      ua = require('ua-parser-js'); // eslint-disable-line global-require
      cookie = require('cookie-cutter'); // eslint-disable-line global-require
    }

    this.state = {
      type: '',
      appId: '',
      settings: {},
    };
  }

  UNSAFE_componentWillMount() {
    const { force = '' } = this.props;

    this.setType(force);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { force = '' } = this.props;
    const { force: nextForce = '', position = 'top' } = nextProps;

    if (nextForce !== force) {
      this.setType(nextForce);
    }
    if (position === 'top') {
      window.document.querySelector('html').classList.add('smartbanner-margin-top');
      window.document.querySelector('html').classList.remove('smartbanner-margin-bottom');
    } else if (nextProps.position === 'bottom') {
      window.document.querySelector('html').classList.add('smartbanner-margin-bottom');
      window.document.querySelector('html').classList.remove('smartbanner-margin-top');
    }
  }

  componentWillUnmount() {
    const documentRoot = window.document.querySelector('html');

    documentRoot.classList.remove('smartbanner-show');
    documentRoot.classList.remove('smartbanner-margin-top');
    documentRoot.classList.remove('smartbanner-margin-bottom');
  }

  setType(deviceType) {
    const { ignoreIosVersion = false } = this.props;
    let type;

    if (isClient) {
      const agent = ua(window.navigator.userAgent);

      if (deviceType) {
        // force set case
        type = deviceType;
      } else if (agent.os.name === 'Windows Phone' || agent.os.name === 'Windows Mobile') {
        type = 'windows';
        // iOS >= 6 has native support for Smart Banner
      } else if (
        agent.os.name === 'iOS' &&
                (ignoreIosVersion ||
                    parseInt(agent.os.version, 10) < 6 ||
                    agent.browser.name !== 'Mobile Safari')
      ) {
        type = 'ios';
      } else if (agent.device.vender === 'Amazon' || agent.browser.name === 'Silk') {
        type = 'kindle';
      } else if (agent.os.name === 'Android') {
        type = 'android';
      }
    }

    this.setState(
      {
        type,
      },
      () => {
        if (type) {
          this.setSettingsByType();
        }
      },
    );
  }

  setSettingsByType() {
    const {
      appMeta = {
        ios: 'apple-itunes-app',
        android: 'google-play-app',
        windows: 'msApplication-ID',
        kindle: 'kindle-fire-app',
      },
      appStoreLanguage = isClient
        ? (window.navigator.language || window.navigator.userLanguage).slice(-2) || 'us'
        : 'us',
    } = this.props;

    const mixins = {
      ios: {
        appMeta: () => appMeta.ios,
        iconRels: ['apple-touch-icon-precomposed', 'apple-touch-icon'],
        getStoreLink: () => `https://itunes.apple.com/${appStoreLanguage}/app/id`,
      },
      android: {
        appMeta: () => appMeta.android,
        iconRels: [
          'android-touch-icon',
          'apple-touch-icon-precomposed',
          'apple-touch-icon',
        ],
        getStoreLink: () => 'http://play.google.com/store/apps/details?id=',
      },
      windows: {
        appMeta: () => appMeta.windows,
        iconRels: [
          'windows-touch-icon',
          'apple-touch-icon-precomposed',
          'apple-touch-icon',
        ],
        getStoreLink: () => 'http://www.windowsphone.com/s?appid=',
      },
      kindle: {
        appMeta: () => appMeta.kindle,
        iconRels: [
          'windows-touch-icon',
          'apple-touch-icon-precomposed',
          'apple-touch-icon',
        ],
        getStoreLink: () => 'amzn://apps/android?asin=',
      },
    };

    this.setState(
      (prevState) => ({
        settings: mixins[prevState.type],
      }),
      () => {
        if (this.state.type) {
          this.parseAppId();
        }
      },
    );
  }

  // eslint-disable-next-line class-methods-use-this
  hide() {
    if (isClient) {
      window.document.querySelector('html').classList.remove('smartbanner-show');
    }
  }

  // eslint-disable-next-line class-methods-use-this
  show() {
    if (isClient) {
      window.document.querySelector('html').classList.add('smartbanner-show');
    }
  }

  close = () => {
    const { daysHidden = 15, onClose } = this.props;

    this.hide();
    cookie.set('smartbanner-closed', 'true', {
      path: '/',
      expires: expiredDateInUTC(daysHidden),
    });

    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  install = () => {
    const { daysReminder = 90, onInstall } = this.props;

    this.hide();
    cookie.set('smartbanner-installed', 'true', {
      path: '/',
      expires: expiredDateInUTC(daysReminder),
    });

    if (onInstall && typeof onInstall === 'function') {
      onInstall();
    }
  };

  parseAppId() {
    if (!isClient) {
      return '';
    }

    const meta = window.document.querySelector(`meta[name="${this.state.settings.appMeta()}"]`);

    if (!meta) {
      return '';
    }

    let appId = '';

    if (this.state.type === 'windows') {
      appId = meta.getAttribute('content');
    } else {
      const content = /app-id=([^\s,]+)/.exec(meta.getAttribute('content'));

      appId = content && content[1] ? content[1] : appId;
    }

    this.setState({
      appId,
    });

    return appId;
  }

  retrieveInfo() {
    const {
      url = { ios: '', android: '', windows: '', kindle: '' },
      price = { ios: 'Free', android: 'Free', windows: 'Free', kindle: 'Free' },
      storeText = {
        ios: 'On the App Store',
        android: 'In Google Play',
        windows: 'In Windows Store',
        kindle: 'In the Amazon Appstore',
      },
    } = this.props;

    const link =
            `${url[this.state.type]}` || this.state.settings.getStoreLink() + this.state.appId;
    const inStore = `
      ${price[this.state.type]} - ${storeText[this.state.type]}`;
    let icon;

    if (isClient) {
      for (let i = 0, max = this.state.settings.iconRels.length; i < max; i++) {
        const rel = window.document.querySelector(
          `link[rel="${this.state.settings.iconRels[i]}"]`,
        );

        if (rel) {
          icon = rel.getAttribute('href');
          break;
        }
      }
    }

    return {
      icon,
      link,
      inStore,
    };
  }

  render() {
    if (!isClient) {
      return <div />;
    }

    // Don't show banner when:
    // 1) if device isn't iOS or Android
    // 2) website is loaded in app,
    // 3) user dismissed banner,
    // 4) or we have no app id in meta
    if (
      !this.state.type ||
            window.navigator.standalone ||
            cookie.get('smartbanner-closed') ||
            cookie.get('smartbanner-installed')
    ) {
      return <div />;
    }

    if (!this.state.appId) {
      return <div />;
    }

    this.show();

    const { position = 'top', title = '', author = '', button = 'View' } = this.props;

    const { icon, link, inStore } = this.retrieveInfo();
    const wrapperClassName = `smartbanner smartbanner-${
      this.state.type
    } smartbanner-${position}`;
    const iconStyle = {
      backgroundImage: `url(${icon})`,
    };

    return (
      <div className={wrapperClassName}>
        <div className="smartbanner-container">
          <button
            type="button"
            className="smartbanner-close"
            aria-label="close"
            onClick={this.close}
          >
                        &times;
          </button>
          <span className="smartbanner-icon" style={iconStyle} />
          <div className="smartbanner-info">
            <div className="smartbanner-title">{title}</div>
            <div className="smartbanner-author">{author}</div>
            <div className="smartbanner-description">{inStore}</div>
          </div>
          <div className="smartbanner-wrapper">
            <a href={link} onClick={this.install} className="smartbanner-button">
              <span className="smartbanner-button-text">{button}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }
}

SmartBanner.propTypes = {
  daysHidden: PropTypes.number,
  daysReminder: PropTypes.number,
  appStoreLanguage: PropTypes.string,
  button: PropTypes.node,
  storeText: PropTypes.objectOf(PropTypes.string),
  price: PropTypes.objectOf(PropTypes.string),
  force: PropTypes.string,
  title: PropTypes.string,
  author: PropTypes.string,
  position: PropTypes.string,
  url: PropTypes.objectOf(PropTypes.string),
  ignoreIosVersion: PropTypes.bool,
  appMeta: PropTypes.shape({
    android: PropTypes.string,
    ios: PropTypes.string,
    windows: PropTypes.string,
    kindle: PropTypes.string,
  }),
  onClose: PropTypes.func,
  onInstall: PropTypes.func,
};

export default SmartBanner;
