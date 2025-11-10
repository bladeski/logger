/**
 * Jest setup file for LoggingService tests
 */

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset Date mocking if used
  if ((global as any).Date.now.restore) {
    (global as any).Date.now.restore();
  }
});

// Mock localStorage globally
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

if (typeof (global as any).localStorage === 'undefined') {
  Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage
  });
} else {
  // Replace methods on existing localStorage
  (global as any).localStorage.getItem = mockLocalStorage.getItem;
  (global as any).localStorage.setItem = mockLocalStorage.setItem;
  (global as any).localStorage.removeItem = mockLocalStorage.removeItem;
  (global as any).localStorage.clear = mockLocalStorage.clear;
}

// Mock console methods globally  
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

if (typeof (global as any).console === 'undefined') {
  Object.defineProperty(global, 'console', {
    value: mockConsole
  });
} else {
  // Patch console methods
  (global as any).console.log = mockConsole.log;
  (global as any).console.warn = mockConsole.warn;
  (global as any).console.error = mockConsole.error;
  (global as any).console.info = mockConsole.info;
}

// Mock DOM APIs globally
const mockDocument = {
  createElement: jest.fn(() => ({
    href: '',
    download: '',
    click: jest.fn()
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

if (typeof (global as any).document === 'undefined') {
  Object.defineProperty(global, 'document', {
    value: mockDocument
  });
} else {
  // Patch/createElement and body methods on existing document
  (global as any).document.createElement = mockDocument.createElement;
  (global as any).document.body = (global as any).document.body || {};
  (global as any).document.body.appendChild = mockDocument.body.appendChild;
  (global as any).document.body.removeChild = mockDocument.body.removeChild;
}

// Mock URL APIs
const mockURL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};

if (typeof (global as any).URL === 'undefined') {
  Object.defineProperty(global, 'URL', {
    value: mockURL
  });
} else {
  (global as any).URL.createObjectURL = mockURL.createObjectURL;
  (global as any).URL.revokeObjectURL = mockURL.revokeObjectURL;
}

// Mock Blob
if (typeof (global as any).Blob === 'undefined') {
  Object.defineProperty(global, 'Blob', {
    value: jest.fn(() => ({}))
  });
} else {
  (global as any).Blob = jest.fn(() => ({}));
}

// Export mocks for use in tests
export {
  mockLocalStorage,
  mockConsole,
  mockDocument,
  mockURL
};