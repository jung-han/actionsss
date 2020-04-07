const core = require('@actions/core');
// const github = require('@actions/github');
const capa = require('./capa');
const { BROWSERSTACK_USERNAME, BROWSERSTACK_ACCESS_KEY } = process.env; // 1. 이 키를 잘 가져가는지

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const http = require('http');
const { Builder } = require('selenium-webdriver');
const HttpAgent = new http.Agent({ keepAlive: true });
const DOCUMENT_LOAD_MAX_TIMEOUT = 20000;
const config = require(path.resolve(process.cwd(), 'tuidoc.config.json')); // config를 잘 가져가는지
const examples = config.examples || {};
const { filePath = '' } = examples;

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
  core.setOutput('result', result.length ? 'failed' : 'success');
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

    console.log(browserName, browserVersion, ' - ', url);
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
    console.log(url);
    console.log(browserName, browserVersion, errorLogs); // error 찍기
  });
}

/**
 * Get Examples Url
 */
function getTestUrls(urlPrefix) {
  if (!filePath) {
    throw Error('not exist examples path at tuidoc.config.json');
  }

  return fs.readdirSync(filePath).reduce((urls, fileName) => {
    if (/html$/.test(fileName)) {
      urls.push(`${urlPrefix}/${filePath}/${fileName}`);
    }
    return urls;
  }, []);
}

try {
  const urlPrefix = core.getInput('url-prefix');
  const globalVariable = core.getInput('global-error-log-variable');
  const browsers = core.getInput('browsers');
  const capabilities = capa.makeCapabilites(browsers);

  if (!globalVariable) {
    throw Error('globalErrorLogVariable option is missing at tuidoc.config.json');
  }

  const urls = getTestUrls(urlPrefix);

  testExamplePage(urls, capabilities, globalVariable).catch((err) => {
    console.log(err);
    process.exit(1);
  });

  // const time = new Date().toTimeString();
  // core.setOutput("time", time);
} catch (error) {
  core.setFailed(error.message);
}
