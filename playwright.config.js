// 이 PC에 이미 있는 Chromium(1248)을 써서 추가 다운로드 없이 실행한다.
const { defineConfig, devices } = require('@playwright/test');
const os = require('os');
const path = require('path');
const localChrome = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: /.*\.e2e\.js/,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8766',
    launchOptions: { executablePath: process.env.CHROME_PATH || localChrome },
  },
  webServer: {
    command: 'python -m http.server 8766 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8766/index.html',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 }, browserName: 'chromium' } },
  ],
});
