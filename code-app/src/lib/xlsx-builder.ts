/**
 * Minimal XLSX (OpenXML) builder — generates a proper .xlsx file
 * as a Uint8Array without any external dependencies.
 *
 * XLSX = ZIP archive containing XML files.
 * Uses STORE (no compression) which all XLSX readers support.
 */

const enc = new TextEncoder()

// ── CRC-32 (ZIP standard) ───────────────────────────────────────

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc = crc ^ data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// ── Minimal ZIP builder (STORE method) ──────────────────────────

function createZip(files: { path: string; content: string }[]): Uint8Array {
  const entries = files.map((f) => {
    const name = enc.encode(f.path)
    const data = enc.encode(f.content)
    return { name, data, crc: crc32(data), offset: 0 }
  })

  let offset = 0
  for (const e of entries) {
    e.offset = offset
    offset += 30 + e.name.length + e.data.length
  }

  const cdOffset = offset
  let cdSize = 0
  for (const e of entries) cdSize += 46 + e.name.length

  const buf = new ArrayBuffer(offset + cdSize + 22)
  const v = new DataView(buf)
  const a = new Uint8Array(buf)
  let p = 0

  // Local file headers + data
  for (const e of entries) {
    v.setUint32(p, 0x04034b50, true); p += 4  // signature
    v.setUint16(p, 20, true); p += 2           // version needed
    v.setUint16(p, 0, true); p += 2            // flags
    v.setUint16(p, 0, true); p += 2            // compression = STORE
    v.setUint16(p, 0, true); p += 2            // mod time
    v.setUint16(p, 0, true); p += 2            // mod date
    v.setUint32(p, e.crc, true); p += 4        // crc32
    v.setUint32(p, e.data.length, true); p += 4 // compressed size
    v.setUint32(p, e.data.length, true); p += 4 // uncompressed size
    v.setUint16(p, e.name.length, true); p += 2 // filename length
    v.setUint16(p, 0, true); p += 2             // extra field length
    a.set(e.name, p); p += e.name.length
    a.set(e.data, p); p += e.data.length
  }

  // Central directory
  for (const e of entries) {
    v.setUint32(p, 0x02014b50, true); p += 4
    v.setUint16(p, 20, true); p += 2  // version made by
    v.setUint16(p, 20, true); p += 2  // version needed
    v.setUint16(p, 0, true); p += 2   // flags
    v.setUint16(p, 0, true); p += 2   // compression
    v.setUint16(p, 0, true); p += 2   // mod time
    v.setUint16(p, 0, true); p += 2   // mod date
    v.setUint32(p, e.crc, true); p += 4
    v.setUint32(p, e.data.length, true); p += 4
    v.setUint32(p, e.data.length, true); p += 4
    v.setUint16(p, e.name.length, true); p += 2
    v.setUint16(p, 0, true); p += 2   // extra field length
    v.setUint16(p, 0, true); p += 2   // comment length
    v.setUint16(p, 0, true); p += 2   // disk number
    v.setUint16(p, 0, true); p += 2   // internal attrs
    v.setUint32(p, 0, true); p += 4   // external attrs
    v.setUint32(p, e.offset, true); p += 4
    a.set(e.name, p); p += e.name.length
  }

  // End of central directory
  v.setUint32(p, 0x06054b50, true); p += 4
  v.setUint16(p, 0, true); p += 2  // disk number
  v.setUint16(p, 0, true); p += 2  // central dir disk
  v.setUint16(p, entries.length, true); p += 2
  v.setUint16(p, entries.length, true); p += 2
  v.setUint32(p, cdSize, true); p += 4
  v.setUint32(p, cdOffset, true); p += 4
  v.setUint16(p, 0, true) // comment length

  return a
}

// ── XLSX generation ─────────────────────────────────────────────

const x = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function col(i: number): string {
  return String.fromCharCode(65 + i)
}

export function buildXlsx(
  headers: readonly string[],
  dataRows: string[][],
): Uint8Array {
  const rows: string[] = []

  // Row 1: headers (style 1 = bold white on blue)
  const hCells = headers.map((h, i) =>
    `<c r="${col(i)}1" t="inlineStr" s="1"><is><t>${x(h)}</t></is></c>`,
  ).join('')
  rows.push(`<row r="1">${hCells}</row>`)

  // Data rows
  dataRows.forEach((row, ri) => {
    const rn = ri + 2
    const cells = row.map((val, ci) => {
      const ref = `${col(ci)}${rn}`
      if (val !== '' && !isNaN(Number(val))) {
        return `<c r="${ref}"><v>${val}</v></c>`
      }
      return `<c r="${ref}" t="inlineStr"><is><t>${x(val)}</t></is></c>`
    }).join('')
    rows.push(`<row r="${rn}">${cells}</row>`)
  })

  const lastCol = col(headers.length - 1)
  const lastRow = dataRows.length + 1

  const contentTypes = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    '</Types>',
  ].join('')

  const rels = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
    '</Relationships>',
  ].join('')

  const workbook = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<sheets><sheet name="Self-Billing Import" sheetId="1" r:id="rId1"/></sheets>',
    '</workbook>',
  ].join('')

  const wbRels = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '</Relationships>',
  ].join('')

  const sheet = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    `<dimension ref="A1:${lastCol}${lastRow}"/>`,
    `<sheetData>${rows.join('')}</sheetData>`,
    '</worksheet>',
  ].join('')

  const styles = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '<fonts count="3">',
    '<font><sz val="11"/><name val="Calibri"/></font>',
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>',
    '<font><i/><sz val="10"/><color rgb="FF666666"/><name val="Calibri"/></font>',
    '</fonts>',
    '<fills count="4">',
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF4472C4"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/></patternFill></fill>',
    '</fills>',
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>',
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
    '<cellXfs count="3">',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>',
    '<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>',
    '</cellXfs>',
    '</styleSheet>',
  ].join('')

  return createZip([
    { path: '[Content_Types].xml', content: contentTypes },
    { path: '_rels/.rels', content: rels },
    { path: 'xl/workbook.xml', content: workbook },
    { path: 'xl/_rels/workbook.xml.rels', content: wbRels },
    { path: 'xl/worksheets/sheet1.xml', content: sheet },
    { path: 'xl/styles.xml', content: styles },
  ])
}
