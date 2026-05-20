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
  | 'lockPassword'
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
  | 'export'
  | 'copy'
  | 'download'
  | 'envelope'
  | 'warningCircle'
  | 'danger'
  | 'info';

export type IconRule = 'evenodd' | 'nonzero';

export type IconPathDefinition =
  | string
  | {
      d: string;
      fillRule?: IconRule;
      clipRule?: IconRule;
    };

export type IconDefinition = {
  paths: IconPathDefinition[];
};
