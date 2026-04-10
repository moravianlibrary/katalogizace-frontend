export type AppIconName = 'close' | 'reset' | 'play' | 'externalLink' | 'add';

export type IconDefinition = {
  paths: Array<{
    d: string;
    fillRule: 'evenodd' | 'nonzero';
    clipRule: 'evenodd' | 'nonzero';
  }>;
};
