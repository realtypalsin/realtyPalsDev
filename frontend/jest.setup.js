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

// Suppress React 18 act(...), DOM attribute, and intentional chip test warnings during test execution
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string') {
    if (
      args[0].includes('was not wrapped in act(...)') ||
      args[0].includes('non-boolean attribute') ||
      args[0].startsWith('[CHIP]')
    ) {
      return;
    }
  }
  originalError(...args);
};
