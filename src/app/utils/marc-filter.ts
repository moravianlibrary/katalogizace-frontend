import { ExistingMarcRecord } from '@/app/models';

export function filterExistingRecord015to830(
  rec: ExistingMarcRecord,
): ExistingMarcRecord {
  return {
    ...rec,
    leader: '',
    special_fields: [],
    normal_fields: rec.normal_fields.filter((f) => {
      const tagNum = Number(f.tag);
      return tagNum >= 15 && tagNum <= 830;
    }),
  };
}
