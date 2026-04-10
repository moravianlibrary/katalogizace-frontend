export type AppIconName = 'close' | 'reset';

export type IconDefinition = {
  viewBox: string;
  paths: Array<{
    d: string;
    fillRule: 'evenodd' | 'nonzero';
    clipRule: 'evenodd' | 'nonzero';
  }>;
};
