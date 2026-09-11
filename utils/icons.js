/**
 * 线性图标库（iconfont 风格）
 * 使用 SVG 矢量，体积极小，可统一配色
 */

function buildSvg(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const PATHS = {
  appointment: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  parking: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4.2a2.8 2.8 0 0 1 0 5.6H9"/>',
  news: '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/><path d="M16 5v4h3"/>',
  visitor: '<circle cx="12" cy="8" r="3.5"/><path d="M5 19c1.2-3 3.4-4.5 7-4.5s5.8 1.5 7 4.5"/>',
  venue: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
  house: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>',
  investment: '<path d="M7 7h10v10H7z"/><path d="M4 4l16 16"/><path d="M16 8h.01"/>',
  policy: '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  activity: '<path d="M4 15s1.5-2 4-2 5 2 8 2 4-2 4-2V5s-1.5 2-4 2-5-2-8-2-4 2-4 2z"/><path d="M4 19v-4"/>',
  contact: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.89.31 1.76.57 2.6a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.48-1.14a2 2 0 0 1 2.11-.45c.84.26 1.71.45 2.6.57A2 2 0 0 1 22 16.92z"/>',
  more: '<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>',
  mine: '<circle cx="12" cy="8" r="4"/><path d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5"/>',
  order: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  repair: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-3.3-3.3z"/>',
  feedback: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
  checkin: '<path d="M20 6 9 17l-5-5"/>',
  nav: '<circle cx="12" cy="10" r="3"/><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/>',
  enterprise: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M12 12v.01"/>',
  property: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  entry: '<path d="M19 17H5"/><path d="m12 6-7 5 7 5"/><path d="M5 11V6a2 2 0 0 1 2-2h10"/>',
  exit: '<path d="M5 17h14"/><path d="m12 7 7 5-7 5"/><path d="M19 13v5a2 2 0 0 1-2 2H7"/>',
  merchants: '<path d="M3 21h18"/><path d="M6 21V7l6-4 6 4v14"/><path d="M10 21v-6h4v6"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1"/>',
}

function getIconSrc(name, color) {
  const paths = PATHS[name]
  if (!paths) return ''
  return buildSvg(paths, color || '#0047b3')
}

module.exports = {
  PATHS,
  getIconSrc,
}
