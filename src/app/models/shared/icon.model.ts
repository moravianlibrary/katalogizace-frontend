export type AppIconName =
  | 'close'
  | 'reset'
  | 'play'
  | 'externalLink'
  | 'add'
  | 'minus';

export type IconDefinition = {
  paths: Array<{
    d: string;
    fillRule: 'evenodd' | 'nonzero';
    clipRule: 'evenodd' | 'nonzero';
  }>;
};
