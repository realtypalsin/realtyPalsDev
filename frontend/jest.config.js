const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^rehype-raw$': '<rootDir>/__mocks__/rehypeRaw.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(rehype-raw|hast-util-parse-selector|property-information|unist-util-position|unist-util-visit|unist-util-is)/)',
  ],

})
