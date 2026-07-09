const ACTIVITY_STATUS = ['报名中', '已结束', '已取消']
const INVESTMENT_STATUS = ['待联系', '已联系', '意向强', '已成交', '无效']
const POLICY_LEVELS = ['全部', '国家级', '市级', '区级', '园区级']
const HOUSE_STATUS_FILTER = ['全部', '在售/在租', '已售/已租']

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
  formatAttendees,
  formatDateTimeShort,
}
