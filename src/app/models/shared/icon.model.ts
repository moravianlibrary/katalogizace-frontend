export type AppIconName =
  | 'x'
  | 'reset'
  | 'play'
  | 'externalLink'
  | 'add'
  | 'minus'
  | 'rotateRight'
  | 'rotateLeft'
  | 'maximize'
  | 'minimize'
  | 'sidebarLeft'
  | 'arrowRight'
  | 'arrowLeft'
  | 'logout'
  | 'user'
  | 'chevronDown'
  | 'lock'
  | 'unlock'
  | 'swapHorizontal'
  | 'trash'
  | 'task'
  | 'check'
  | 'checkCircle'
  | 'search'
  | 'camera'
  | 'upload'
  | 'refresh'
  | 'folderAdd'
  | 'edit';

export type IconDefinition = {
  paths: Array<{
    d: string;
    fillRule: 'evenodd' | 'nonzero';
    clipRule: 'evenodd' | 'nonzero';
  }>;
};
