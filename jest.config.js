module.exports = {
  preset: 'react-native',
  roots: ['<rootDir>/packages', '<rootDir>/apps/mobile'],
  transform: { '^.+\\.(ts|tsx)$': 'ts-jest' },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  moduleNameMapper: { '^@pichat/(.*)$': '<rootDir>/packages/$1/src' }
};
