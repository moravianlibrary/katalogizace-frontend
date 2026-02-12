import { ExistingMarcRecord } from '@/app/models';

export function filterExistingRecord015to830(
  rec: ExistingMarcRecord,
): ExistingMarcRecord {
  return {
    ...rec,
    leader: '',
    control_fields: [],
    data_fields: rec.data_fields.filter((f) => {
      const tagNum = Number(f.tag);
      return tagNum >= 15 && tagNum <= 830;
    }),
  };
}
