const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^rehype-raw$': '<rootDir>/__mocks__/rehypeRaw.js',
    '^rehype-sanitize$': '<rootDir>/__mocks__/rehypeSanitize.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(rehype-raw|rehype-sanitize|hast-util-sanitize|hast-util-parse-selector|property-information|unist-util-position|unist-util-visit|unist-util-is)/)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
  ],

})
