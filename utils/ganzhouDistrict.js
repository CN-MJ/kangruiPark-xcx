/** 赣州市 18 县（市、区），与后端 GanzhouDistrict 保持一致 */
const DISTRICT_NAMES = [
  '章贡区',
  '南康区',
  '赣县区',
  '信丰县',
  '大余县',
  '上犹县',
  '崇义县',
  '安远县',
  '龙南市',
  '定南县',
  '全南县',
  '宁都县',
  '于都县',
  '兴国县',
  '会昌县',
  '寻乌县',
  '石城县',
  '瑞金市',
]

const ADDRESS_ALIASES = [
  ['经济技术开发区', '章贡区'],
  ['高新技术产业开发区', '章贡区'],
  ['赣南健康城', '章贡区'],
  ['章贡区', '章贡区'],
  ['南康区', '南康区'],
  ['赣县区', '赣县区'],
  ['信丰县', '信丰县'],
  ['大余县', '大余县'],
  ['上犹县', '上犹县'],
  ['崇义县', '崇义县'],
  ['安远县', '安远县'],
  ['龙南市', '龙南市'],
  ['龙南县', '龙南市'],
  ['定南县', '定南县'],
  ['全南县', '全南县'],
  ['宁都县', '宁都县'],
  ['于都县', '于都县'],
  ['兴国县', '兴国县'],
  ['会昌县', '会昌县'],
  ['寻乌县', '寻乌县'],
  ['石城县', '石城县'],
  ['瑞金市', '瑞金市'],
  ['瑞金县', '瑞金市'],
  ['经开区', '章贡区'],
  ['高新区', '章贡区'],
  ['健康城', '章贡区'],
  ['水西', '章贡区'],
  ['章贡', '章贡区'],
  ['南康', '南康区'],
  ['赣县', '赣县区'],
  ['信丰', '信丰县'],
  ['大余', '大余县'],
  ['上犹', '上犹县'],
  ['崇义', '崇义县'],
  ['安远', '安远县'],
  ['龙南', '龙南市'],
  ['定南', '定南县'],
  ['全南', '全南县'],
  ['宁都', '宁都县'],
  ['于都', '于都县'],
  ['兴国', '兴国县'],
  ['会昌', '会昌县'],
  ['寻乌', '寻乌县'],
  ['石城', '石城县'],
  ['瑞金', '瑞金市'],
]

const CENTERS = {
  章贡区: { lat: 25.8312, lng: 114.9336 },
  南康区: { lat: 25.6617, lng: 114.765 },
  赣县区: { lat: 25.8607, lng: 115.0116 },
  信丰县: { lat: 25.3862, lng: 114.9229 },
  大余县: { lat: 25.402, lng: 114.3622 },
  上犹县: { lat: 25.7943, lng: 114.5515 },
  崇义县: { lat: 25.6816, lng: 114.3083 },
  安远县: { lat: 25.1369, lng: 115.3939 },
  龙南市: { lat: 24.9111, lng: 114.7899 },
  定南县: { lat: 24.7842, lng: 115.0278 },
  全南县: { lat: 24.7424, lng: 114.5302 },
  宁都县: { lat: 26.4702, lng: 116.0094 },
  于都县: { lat: 25.9521, lng: 115.4154 },
  兴国县: { lat: 26.3378, lng: 115.3632 },
  会昌县: { lat: 25.6007, lng: 115.7861 },
  寻乌县: { lat: 24.9634, lng: 115.6515 },
  石城县: { lat: 26.3266, lng: 116.3423 },
  瑞金市: { lat: 25.8856, lng: 116.0271 },
}

const MAX_CENTER_KM = 55

function haversineKm(lat1, lng1, lat2, lng2) {
  const earth = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)))
}

function resolveFromAddress(address) {
  const text = String(address || '').trim()
  if (!text) return ''
  for (let i = 0; i < ADDRESS_ALIASES.length; i += 1) {
    const [needle, district] = ADDRESS_ALIASES[i]
    if (text.indexOf(needle) !== -1) return district
  }
  return ''
}

function resolveFromCoords(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  if (lat < 24.2 || lat > 27.2 || lng < 113.5 || lng > 117.2) return ''

  let best = ''
  let bestKm = Infinity
  Object.keys(CENTERS).forEach((name) => {
    const c = CENTERS[name]
    const km = haversineKm(lat, lng, c.lat, c.lng)
    if (km < bestKm) {
      bestKm = km
      best = name
    }
  })
  return bestKm <= MAX_CENTER_KM ? best : ''
}

function resolveDistrict(address, latitude, longitude) {
  return resolveFromAddress(address) || resolveFromCoords(latitude, longitude) || ''
}

module.exports = {
  DISTRICT_NAMES,
  resolveDistrict,
}
