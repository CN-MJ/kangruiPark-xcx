const ACTIVITY_STATUS = ['报名中', '已结束', '已取消']
const INVESTMENT_STATUS = ['待联系', '已联系', '意向强', '已成交', '无效']
const POLICY_LEVELS = ['全部', '国家级', '市级', '区级', '园区级']
const HOUSE_LEASE_FILTER = [
  { value: 'all', label: '全部状态' },
  { value: 'available', label: '未租未售' },
  { value: 'rented_sold', label: '已租已售' },
  { value: 'rented_unsold', label: '已租未售' },
  { value: 'sold_unrented', label: '未租已售' },
]
const HOUSE_MARKET_FILTER = [
  { value: 'all', label: '全部上架' },
  { value: '1', label: '已上架' },
  { value: '0', label: '已下架' },
]
const HOUSE_LEASE_OPTIONS = [
  { value: 'available', label: '未租未售' },
  { value: 'rented_sold', label: '已租已售' },
  { value: 'rented_unsold', label: '已租未售' },
  { value: 'sold_unrented', label: '未租已售' },
]
// 兼容旧引用
const HOUSE_STATUS_FILTER = HOUSE_LEASE_FILTER.map((item) => item.label)

function formatAttendees(registered, max) {
  const reg = Number(registered || 0)
  const cap = Number(max || 0)
  return cap > 0 ? `${reg} / ${cap}` : `${reg} / 不限`
}

function formatDateTimeShort(dateStr) {
  if (!dateStr) return ''
  return String(dateStr).replace('T', ' ').slice(0, 16)
}

module.exports = {
  ACTIVITY_STATUS,
  INVESTMENT_STATUS,
  POLICY_LEVELS,
  HOUSE_STATUS_FILTER,
  HOUSE_LEASE_FILTER,
  HOUSE_MARKET_FILTER,
  HOUSE_LEASE_OPTIONS,
  formatAttendees,
  formatDateTimeShort,
}
