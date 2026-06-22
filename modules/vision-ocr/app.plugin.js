// Config plugin for the local Vision OCR module. The Swift code is autolinked via
// expo-module.config.json, so no native build mutation is required today — this is
// the documented hook for future native tweaks (entitlements, build settings) and a
// pass-through for now. Referenced from app.config.ts `plugins`.

/** @param {import('expo/config').ExpoConfig} config */
const withVisionOcr = (config) => config;

module.exports = withVisionOcr;
