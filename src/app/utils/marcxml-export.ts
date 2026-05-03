import { ExistingMarcRecord } from '@/app/models';

export function toMarcxml(record: ExistingMarcRecord): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<record xmlns="http://www.loc.gov/MARC21/slim">');

  lines.push(`  <leader>${escapeXmlText(record.leader ?? '')}</leader>`);

  for (const field of record.control_fields ?? []) {
    lines.push(
      `  <controlfield tag="${escapeXmlAttr(field.tag)}">${escapeXmlText(
        field.value ?? '',
      )}</controlfield>`,
    );
  }

  for (const field of record.data_fields ?? []) {
    const ind1 = normalizeIndicator(field.ind1);
    const ind2 = normalizeIndicator(field.ind2);

    lines.push(
      `  <datafield tag="${escapeXmlAttr(field.tag)}" ind1="${escapeXmlAttr(
        ind1,
      )}" ind2="${escapeXmlAttr(ind2)}">`,
    );

    for (const subfield of field.subfields ?? []) {
      lines.push(
        `    <subfield code="${escapeXmlAttr(
          subfield.code,
        )}">${escapeXmlText(subfield.value ?? '')}</subfield>`,
      );
    }

    lines.push('  </datafield>');
  }

  lines.push('</record>');

  return lines.join('\n');
}

function normalizeIndicator(value: string | null | undefined): string {
  return value && value.length > 0 ? value : ' ';
}

function escapeXmlText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeXmlAttr(value: string): string {
  return escapeXmlText(value)
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
