const mockKernel = { lanczos3: 'lanczos3' };

const mockSharp = jest.fn().mockReturnValue({
  resize: jest.fn().mockReturnThis(),
  modulate: jest.fn().mockReturnThis(),
  linear: jest.fn().mockReturnThis(),
  flatten: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-processed')),
});

Object.defineProperty(mockSharp, 'kernel', {
  value: mockKernel,
  writable: false,
});

export default mockSharp;
export { mockKernel as kernel };
