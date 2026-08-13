const mockPage = {
  setViewport: jest.fn(() => Promise.resolve()),
  setContent: jest.fn(() => Promise.resolve()),
  screenshot: jest.fn(() => Promise.resolve(Buffer.from('mock-png'))),
  waitForNetworkIdle: jest.fn(() => Promise.resolve()),
  evaluate: jest.fn(() => Promise.resolve(true)),
  setRequestInterception: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  close: jest.fn(() => Promise.resolve()),
};

const mockBrowser = {
  newPage: jest.fn(() => Promise.resolve(mockPage)),
  close: jest.fn(() => Promise.resolve()),
};

export const launch = jest.fn(() => Promise.resolve(mockBrowser));

export default { launch };
