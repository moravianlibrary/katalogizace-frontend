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
  | 'folderOpen'
  | 'edit'
  | 'fitToScreen'
  | 'filter'
  | 'document'
  | 'editUnderline'
  | 'checkCircleEmpty'
  | 'clipboardTick'
  | 'shieldError'
  | 'timer'
  | 'users'
  | 'userAdd'
  | 'crown'
  | 'settings'
  | 'book'
  | 'export';

export type IconDefinition = {
  paths: Array<{
    d: string;
    fillRule: 'evenodd' | 'nonzero';
    clipRule: 'evenodd' | 'nonzero';
  }>;
};
