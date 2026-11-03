type Row = Record<string, unknown>;
type Item = Record<string, string>;
const aliases: Record<string, Record<string, string>> = {
  experience: { title: 'position' }, projects: { technologies: 'tech_stack' },
  education: { school: 'institution', field: 'field_of_study' }, certifications: {}, languages: {},
};
export function builderItems(value: unknown, section: string): Item[] {
  if (!Array.isArray(value)) return [];
  return value.map((value) => {
    const row: Row = typeof value === 'string' ? { name: value } : value;
    const item: Item = { id: String(row.id || crypto.randomUUID()) };
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string' || typeof value === 'number') item[key] = String(value);
      if (key === 'technologies' && Array.isArray(value)) item[key] = value.join(', ');
    }
    for (const [display, canonical] of Object.entries(aliases[section] || {})) {
      const value = row[canonical] ?? row[display] ?? (display === 'title' ? row.role : '');
      item[display] = Array.isArray(value) ? value.join(', ') : String(value ?? '');
    }
    return item;
  });
}
export function mergeBuilderItems(items: Item[], original: unknown, section: string): Row[] {
  const originals = Array.isArray(original) ? original as Row[] : [];
  return items.map((item) => {
    const row: Row = { ...originals.find(value => value.id === item.id), ...item };
    for (const [display, canonical] of Object.entries(aliases[section] || {})) {
      if (display === 'technologies') row[canonical] = (item[display] || '').split(',').map(s => s.trim()).filter(Boolean);
      else row[canonical] = item[display] || '';
      delete row[display];
    }
    if (section === 'experience') {
      row.role = row.position;
      if (typeof row.technologies === 'string') row.technologies = row.technologies.split(',').map(s => s.trim()).filter(Boolean);
    }
    for (const key of ['start_year', 'end_year', 'gpa', 'gpa_scale']) {
      if (typeof row[key] === 'string' && row[key] !== '') row[key] = Number(row[key]);
    }
    return row;
  });
}
