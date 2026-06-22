// Jest setup. Use the official in-memory AsyncStorage mock so storage/migration
// logic can be unit-tested without a native module.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
