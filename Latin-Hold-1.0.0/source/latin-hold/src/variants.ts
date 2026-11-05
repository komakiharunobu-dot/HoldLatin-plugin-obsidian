export type VariantMap = Record<string, string[]>;

const chars = (text: string): string[] => [...text];
const map = (rows: Record<string, string>): VariantMap =>
  Object.fromEntries(Object.entries(rows).map(([key, value]) => [key, chars(value)]));

// Common European orthographies, plus a few scholarly Latin diacritics.
// This is deliberately a curated list, not a claim to cover all of Unicode.
export const COMMON = map({
  a: 'àáâäæãåāăąǎ', b: 'ḃḅḇ', c: 'çćčĉċ', d: 'ðďđḋḍ',
  e: 'éèêëēėęěĕẽ', f: 'ḟ', g: 'ğģĝġǧ', h: 'ĥħḣḥḧ',
  i: 'íìîïīįıĭĩǐ', j: 'ĵǰ', k: 'ķǩḱḳ', l: 'łĺļľḷ',
  m: 'ḿṁṃ', n: 'ñńňņŋṅṇ', o: 'ôöóòœõøōőŏǒ',
  p: 'ṕṗ', r: 'ŕřŗṙṛ', s: 'ßśšşșŝṡṣ', t: 'þťţțŧṫṭ',
  u: 'üùúûūůűũŭųǔ', v: 'ṽṿ', w: 'ŵẁẃẅ', x: 'ẋẍ',
  y: 'ÿýŷỳȳ', z: 'źżžẓ'
});

export const PRESETS: Record<string, { label: string; letters: VariantMap }> = {
  common: { label: '常用拉丁字母（多语言）', letters: COMMON },
  french: { label: '法语 Français', letters: map({ a: 'àâæ', c: 'ç', e: 'éèêë', i: 'îï', o: 'ôœ', u: 'ùûü', y: 'ÿ' }) },
  german: { label: '德语 Deutsch', letters: map({ a: 'ä', o: 'ö', u: 'ü', s: 'ß' }) },
  spanish: { label: '西班牙语 Español', letters: map({ a: 'á', e: 'é', i: 'í', n: 'ñ', o: 'ó', u: 'úü' }) },
  portuguese: { label: '葡萄牙语 Português', letters: map({ a: 'áàâã', c: 'ç', e: 'éê', i: 'í', o: 'óôõ', u: 'ú' }) },
  italian: { label: '意大利语 Italiano', letters: map({ a: 'à', e: 'èé', i: 'ì', o: 'òó', u: 'ù' }) },
  nordic: { label: '北欧语言 / 冰岛语', letters: map({ a: 'åäæá', d: 'ð', e: 'é', i: 'í', o: 'öøó', t: 'þ', u: 'ú', y: 'ý' }) },
  central: { label: '中东欧常用（波 / 捷 / 匈 / 罗等）', letters: map({ a: 'ąáăâ', c: 'ćč', d: 'ďđ', e: 'ęéě', i: 'íî', l: 'łĺľ', n: 'ńň', o: 'óöő', r: 'řŕ', s: 'śšșş', t: 'ťțţ', u: 'úůüű', y: 'ý', z: 'źżž' }) },
  turkish: { label: '土耳其语 Türkçe', letters: map({ c: 'ç', g: 'ğ', i: 'ı', o: 'ö', s: 'ş', u: 'ü' }) }
};

export function parseCustom(raw: string): VariantMap {
  if (!raw.trim()) return {};
  let input: unknown;
  try { input = JSON.parse(raw); } catch { throw new Error('JSON 格式有误。示例：{"e":["é","è","ê","ë"]}'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('请填写一个 JSON 对象。');
  const output: VariantMap = {};
  for (const [key, value] of Object.entries(input)) {
    if (!/^[a-z]$/.test(key)) throw new Error(`键名「${key}」必须是单个小写英文字母。`);
    if (!Array.isArray(value) || value.length > 90) throw new Error(`「${key}」应是最多 90 个候选的数组。`);
    output[key] = [];
    for (const item of value) {
      if (typeof item !== 'string' || !/^\p{Script=Latin}\p{M}*$/u.test(item)) {
        throw new Error(`「${key}」的每个候选必须是一个拉丁字母（可带组合变音符号）。`);
      }
      const normalized = item.normalize('NFC');
      if (!output[key].includes(normalized)) output[key].push(normalized);
    }
  }
  return output;
}

export function variantsFor(base: string, preset: string, custom: VariantMap): string[] {
  if (!/^[a-z]$/i.test(base)) return [];
  const lower = base.toLowerCase();
  const hasCustom = Object.prototype.hasOwnProperty.call(custom, lower);
  const source = Object.prototype.hasOwnProperty.call(PRESETS, preset) ? PRESETS[preset] : PRESETS.common;
  let values = [...(hasCustom ? custom[lower] : source.letters[lower] || [])];
  if (base === base.toUpperCase()) {
    values = values.map(char => char === 'ß' ? 'ẞ' : char.toUpperCase().normalize('NFC'));
    if (lower === 'i' && !hasCustom && (preset === 'turkish' || preset === 'common')) values.unshift('İ');
  }
  return [...new Set(values)].filter(char => char !== base);
}
