const mockGetContext = jest.fn(() => ({
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(8 * 8 * 4) })),
}));

export const createCanvas = jest.fn(() => ({
  getContext: mockGetContext,
  toBuffer: jest.fn(() => Buffer.from('mock-image')),
}));

export const loadImage = jest.fn(() => Promise.resolve({ width: 8, height: 8 }));

export default { createCanvas, loadImage };
