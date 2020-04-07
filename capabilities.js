/**
 * Capabilities
 * https://www.browserstack.com/automate/capabilities
 */
const capabilityMap = {
  ie8: {
    os: 'Windows',
    os_version: '7',
    browserName: 'IE',
    browser_version: '8.0',
  },
  ie9: {
    os: 'Windows',
    os_version: '7',
    browserName: 'IE',
    browser_version: '9.0',
  },
  ie10: {
    os: 'Windows',
    osVersion: '7',
    name: 'IE10 Test',
    browserName: 'IE',
    browserVersion: '10.0',
  },
  ie11: {
    os: 'Windows',
    osVersion: '10',
    name: 'IE11 Test',
    browserName: 'IE',
    browserVersion: '11.0',
  },
  safari: {
    os: 'OS X',
    osVersion: 'Catalina',
    name: 'Safari Test',
    browserName: 'Safari',
  },
  edge: {
    os: 'Windows',
    osVersion: '10',
    name: 'Edge Test',
    browserName: 'Edge',
  },
  firefox: {
    browserName: 'Firefox',
    name: 'Firefox Test',
    os: 'Windows',
  },
  chrome: {
    browserName: 'Chrome',
    name: 'Chrome Test',
    os: 'Windows',
  },
};

function makeCapabilites(browsers) {
  const list = browsers.toLowerCase().replace(/ /g, '').split(',');
  return list.reduce((acc, browser) => {
    if (!capabilityMap[browser]) {
      throw Error('unsupported browser!');
    }

    return [...acc, capabilityMap[browser]];
  }, []);
}

module.exports = {
  makeCapabilites,
};
