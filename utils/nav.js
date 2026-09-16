const ROUTES = {
  order: '/pages/orders/index',
  checkin: '/pages/checkin/index',
  feedback: '/pages/feedback/index',
  nav: '/pages/nav/index',
  repair: '/pages/repair/index',
  visitor: '/pages/appointment/create?type=visitor',
  activity: '/pages/appointment/create?type=activity',
  more: '/pages/more/index',
  property: '/pages/property/index',
  parking: '/pages/parking/index',
  venue: '/pages/appointment/create?type=venue',
  enterprise: '/pages/enterprise/index',
  enterprises: '/pages/enterprises/index',
  enterprise_detail: '/pages/enterprises/detail',
  appointment_query: '/pages/orders/index',
  appointment_hub: '/pages/appointment/index',
  parking_query: '/pages/parking/index',
  news_list: '/pages/news/list',
  contact: '/pages/contact/index',
  visitor_reg: '/pages/appointment/create?type=visitor',
  more_service: '/pages/more/index',
  news_detail: '/pages/news/detail',
  news_more: '/pages/news/list',
  houses: '/pages/houses/index',
  investment: '/pages/investment/index',
  policies: '/pages/policies/index',
  service_team: '/pages/service-team/index',
  activities: '/pages/activities/index',
  merchant_login: '/pages/merchant/login',
}

function go(action, options = {}) {
  const baseUrl = ROUTES[action]
  if (!baseUrl) {
    wx.showToast({ title: '功能暂未开放', icon: 'none' })
    return
  }

  const [path, existingQuery = ''] = baseUrl.split('?')
  const params = {}
  if (existingQuery) {
    existingQuery.split('&').forEach((pair) => {
      const [k, v] = pair.split('=')
      if (k) params[k] = decodeURIComponent(v || '')
    })
  }
  Object.keys(options || {}).forEach((key) => {
    const value = options[key]
    if (value === undefined || value === null || value === '') return
    params[key] = value
  })

  const qs = Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

  wx.navigateTo({ url: qs ? `${path}?${qs}` : path })
}

module.exports = {
  ROUTES,
  go,
}
