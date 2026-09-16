const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { formatDate } = require('../../../utils/format')

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

const ALL_MENUS = [
  {
    title: '预约管理',
    desc: '查看与处理访客预约',
    url: '/packageAdmin/pages/appointments/index',
    icon: 'order',
    theme: 'blue',
    permission: 'appointments',
  },
  {
    title: '停车管理',
    desc: '车辆进出与余位',
    url: '/packageAdmin/pages/parking/index',
    icon: 'parking',
    theme: 'green',
    permission: 'parking',
  },
  {
    title: '新闻管理',
    desc: '园区动态与首页公告',
    url: '/packageAdmin/pages/news/list/index',
    icon: 'news',
    theme: 'orange',
    permission: 'news',
  },
  {
    title: '健康企业汇',
    desc: '走访企业录入与管理',
    url: '/packageAdmin/pages/enterprises/index',
    icon: 'merchants',
    theme: 'purple',
    permission: 'enterprises',
  },
  {
    title: '企业类型',
    desc: '健康服务大类与小类',
    url: '/packageAdmin/pages/enterprise-categories/index',
    icon: 'policy',
    theme: 'blue',
    permission: 'categories',
  },
  {
    title: '房源管理',
    desc: '招商房源 · 关联意向',
    url: '/packageAdmin/pages/houses/index',
    icon: 'house',
    theme: 'blue',
    permission: 'houses',
  },
  {
    title: '政策管理',
    desc: '政策发布 · 政策直达',
    url: '/packageAdmin/pages/policies/index',
    icon: 'policy',
    theme: 'green',
    permission: 'policies',
  },
  {
    title: '服务团队',
    desc: '证件照 · 姓名职务电话',
    url: '/packageAdmin/pages/service-teams/index',
    icon: 'team',
    theme: 'blue',
    permission: 'service_teams',
  },
  {
    title: '活动管理',
    desc: '活动发布 · 报名管理',
    url: '/packageAdmin/pages/activities/index',
    icon: 'activity',
    theme: 'orange',
    permission: 'activities',
  },
  {
    title: '招商意向',
    desc: '线索跟进 · 关联房源',
    url: '/packageAdmin/pages/investments/index',
    icon: 'investment',
    theme: 'purple',
    permission: 'investments',
  },
]

Page({
  data: {
    statusBarHeight: 20,
    greeting: '',
    dateText: '',
    parkName: '',
    parkRoleText: '',
    stats: null,
    loading: false,
    statsError: '',
    menus: [],
  },

  onLoad() {
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.setData({ statusBarHeight: windowInfo.statusBarHeight || 20 })
  },

  onShow() {
    if (!parkAuth.canAccessParkAdmin()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }

    this.refreshProfileAndMenus()
    this.loadStats()
  },

  refreshProfileAndMenus() {
    const superAuth = require('../../../utils/superAuth')
    const acting = parkAuth.isSuperActingAsPark()
    const applyLocal = () => {
      const user = parkAuth.getParkUser() || superAuth.getUser()
      this.setData({
        greeting: getGreeting(),
        dateText: formatDate(new Date()),
        parkName: user ? user.name : '园区人员',
        parkRoleText: acting
          ? '超管代管'
          : ((user && user.park_role_text) || ''),
        isSuperMode: superAuth.isSuperLoggedIn(),
        menus: ALL_MENUS.filter((item) => parkAuth.hasPermission(item.permission)),
      })
    }

    applyLocal()

    return parkRequest('/park/me')
      .then((res) => {
        const user = res.data
        if (user && parkAuth.isParkLoggedIn()) {
          parkAuth.setAuth(parkAuth.getToken(), user)
        }
        applyLocal()
      })
      .catch(() => applyLocal())
  },

  onPullDownRefresh() {
    Promise.all([this.refreshProfileAndMenus(), this.loadStats()])
      .finally(() => wx.stopPullDownRefresh())
  },

  loadStats() {
    this.setData({ loading: true, statsError: '', stats: null })
    return parkRequest('/park/dashboard')
      .then((res) => {
        this.setData({ stats: res.data || {}, loading: false, statsError: '' })
      })
      .catch((err) => {
        const message = (err && err.message) || '统计加载失败'
        this.setData({
          loading: false,
          stats: null,
          statsError: message,
        })
        wx.showToast({ title: message, icon: 'none', duration: 3000 })
      })
  },

  onMenuTap(e) {
    const { url, permission } = e.currentTarget.dataset
    if (permission && !parkAuth.hasPermission(permission)) {
      wx.showToast({ title: '无权访问该功能', icon: 'none' })
      return
    }
    wx.navigateTo({ url })
  },

  onBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.reLaunch({ url: '/pages/mine/index' })
  },

  onChangePassword() {
    const superAuth = require('../../../utils/superAuth')
    if (superAuth.isSuperLoggedIn() && !parkAuth.isParkLoggedIn()) {
      wx.showToast({ title: '超管模式请在账号侧管理密码', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/packageAdmin/pages/change-password/index' })
  },

  onLogout() {
    const superAuth = require('../../../utils/superAuth')
    // 超管代管进入工作台首页：退出即结束超管会话，保留微信登录
    if (parkAuth.isSuperActingAsPark()) {
      wx.showModal({
        title: '结束代管',
        content: '当前为超管代管工作台。退出后将结束控制台会话，微信个人登录会保留。',
        success: (res) => {
          if (!res.confirm) return
          const { superRequest } = require('../../../utils/request')
          superRequest('/super/logout', { method: 'POST' }).finally(() => {
            superAuth.clearToken()
            parkAuth.clearAuth()
            wx.reLaunch({ url: '/pages/mine/index' })
          })
        },
      })
      return
    }

    wx.showModal({
      title: '退出登录',
      content: '确定退出园区工作台吗？不影响微信个人登录。',
      success: (res) => {
        if (!res.confirm) return
        parkRequest('/park/logout', { method: 'POST' }).finally(() => {
          parkAuth.clearAuth()
          wx.reLaunch({ url: '/pages/mine/index' })
        })
      },
    })
  },
})
