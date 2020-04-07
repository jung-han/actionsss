const core = require('@actions/core');
const assert = require('assert');
const { Builder } = require('selenium-webdriver');
const http = require('http');
const cap = require('./capabilities');
const HttpAgent = new http.Agent({ keepAlive: true });
const { BROWSERSTACK_USERNAME, BROWSERSTACK_ACCESS_KEY } = process.env;
const DOCUMENT_LOAD_MAX_TIMEOUT = 20000;

/**
 * Url test
 */
async function testExamplePage(urls, capabilities, globalErrorLogVariable) {
  const parallelPendingTests = Object.keys(capabilities).map((index) =>
    testPlatform(capabilities[index], urls, globalErrorLogVariable)
  );
  const testResults = await Promise.all(parallelPendingTests);
  const result = testResults.flat().reduce((errorList, testInfo) => {
    if (!Array.isArray(testInfo.errorLogs)) {
      // When there is no error catch code in the example page.
      testInfo.errorLogs = {
        message: 'Not exist error catch code snippet in example page',
      };
      errorList.push(testInfo);
    } else if (testInfo.errorLogs.length) {
      errorList.push(testInfo);
    }
    return errorList;
  }, []);

  printErrorLog(result);

  assert.equal(result.length, 0);
}

/*
 * Test one platform
 */
async function testPlatform(platformInfo, urls, globalErrorLogVariable) {
  const driver = getDriver(platformInfo);
  const errorLogVariable =
    typeof globalErrorLogVariable === 'string' ? globalErrorLogVariable : 'errorLogs';
  const result = [];

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];
    await driver.get(url);
    await driver.wait(
      () =>
        driver
          .executeScript('return document.readyState')
          .then((readyState) => readyState === 'complete'),
      DOCUMENT_LOAD_MAX_TIMEOUT
    );

    const browserInfo = await driver.getCapabilities();
    const errorLogs = await driver.executeScript(`return window.${errorLogVariable}`);
    const browserName = browserInfo.get('browserName');
    const browserVersion = browserInfo.get('version') || browserInfo.get('browserVersion');

    result.push({ url, browserName, browserVersion, errorLogs });

    console.log(`🚀 ${browserName} ${browserVersion} - ${url}`);
  }

  driver.quit();

  return result;
}

/**
 * Get Selenium Builder
 */
function getDriver(platformInfo) {
  return new Builder()
    .usingHttpAgent(HttpAgent)
    .withCapabilities({
      ...platformInfo,
      build: `examplePageTest-${new Date().toLocaleDateString()}`,
    })
    .usingServer(
      `http://${BROWSERSTACK_USERNAME}:${BROWSERSTACK_ACCESS_KEY}@hub.browserstack.com/wd/hub`
    )
    .build();
}

/**
 * Print browser error logs
 */
function printErrorLog(errorBrowsersInfo) {
  errorBrowsersInfo.forEach(({ url, browserName, browserVersion, errorLogs }) => {
    console.log(`\n🔥 ${browserName} ${browserVersion} ${url} / `);
    console.log(errorLogs, '\n');
  });
}

try {
  const urls = core.getInput('urls').replace(/ /g, '').split(',');
  const globalVariable = core.getInput('global-error-log-variable');
  const browsers = core.getInput('browsers');
  const capabilities = cap.makeCapabilites(browsers);

  if (!globalVariable) {
    throw Error('global-error-log-variable is missing at action.yml');
  }

  testExamplePage(urls, capabilities, globalVariable).catch((err) => {
    console.log(err);
    process.exit(1);
  });

  const time = new Date().toTimeString();
  core.setOutput('time', time);
} catch (error) {
  core.setFailed(error.message);
}
