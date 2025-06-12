module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'transform-inline-environment-variables',
        {
          include: ['TAMAGUI_TARGET', 'EXPO_ROUTER_APP_ROOT'],
        },
      ],
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './src/tamagui.config.ts',
          logTimings: true,
        },
      ],
    ],
  };
};
