export type SubDiffKind = 'same' | 'changed' | 'missing_or_extra';

export type SubDiffIndex = {
  opened: Map<string, Map<string, SubDiffKind>>;
  preview: Map<string, Map<string, SubDiffKind>>;
};
