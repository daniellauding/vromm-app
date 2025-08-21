const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: [
          '@supabase/supabase-js',
          '@supabase/gotrue-js',
          '@supabase/realtime-js',
          '@supabase/storage-js',
          '@supabase/functions-js',
          '@supabase/postgrest-js',
          'tamagui',
          '@tamagui',
        ],
      },
    },
    argv
  );

  // Customize the config before returning it.
  return config;
};