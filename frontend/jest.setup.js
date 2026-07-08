process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3002/api/v1';
process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:3002';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
