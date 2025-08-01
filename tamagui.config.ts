import config from './src/tamagui.config';

// Make sure the config is properly exported
const tamaguiConfig = config;

export default tamaguiConfig;
export type Conf = typeof tamaguiConfig;
