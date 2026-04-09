export type AppIconName = 'close';

export type IconDefinition = {
  viewBox: string;
  paths: Array<{
    d: string;
    fillRule: 'evenodd' | 'nonzero';
    clipRule: 'evenodd' | 'nonzero';
  }>;
};
