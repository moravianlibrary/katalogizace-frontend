export type AppIconName = string;

export type IconDefinition = {
  viewBox: string;
  paths: Array<{
    d: string;
    fillRule: 'evenodd' | 'nonzero';
    clipRule: 'evenodd' | 'nonzero';
  }>;
};
