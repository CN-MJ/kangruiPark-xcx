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

Page({
  data: {
    statusBarHeight: 20,
    greeting: '',
    dateText: '',
    parkName: '',
    stats: null,
    loading: false,
    statsError: '',
    menus: [
      {
        title: '预约管理',
        desc: '查看与处理访客预约',
        url: '/packageAdmin/pages/appointments/index',
        icon: 'order',
        theme: 'blue',
      },
      {
        title: '停车管理',
        desc: '车辆进出与余位',
        url: '/packageAdmin/pages/parking/index',
        icon: 'parking',
        theme: 'green',
      },
      {
        title: '新闻管理',
        desc: '园区动态与首页公告',
        url: '/packageAdmin/pages/news/list/index',
        icon: 'news',
        theme: 'orange',
      },
      {
        title: '企业库',
        desc: '走访企业录入与管理',
        url: '/packageAdmin/pages/enterprises/index',
        icon: 'merchants',
        theme: 'purple',
      },
      {
        title: '企业类型',
        desc: '健康服务大类与小类',
        url: '/packageAdmin/pages/enterprise-categories/index',
        icon: 'policy',
        theme: 'blue',
      },
      {
        title: '房源管理',
        desc: '招商房源 · 关联意向',
        url: '/packageAdmin/pages/houses/index',
        icon: 'house',
        theme: 'blue',
      },
      {
        title: '政策管理',
        desc: '政策发布 · 政策直达',
        url: '/packageAdmin/pages/policies/index',
        icon: 'policy',
        theme: 'green',
      },
      {
        title: '活动管理',
        desc: '活动发布 · 报名管理',
        url: '/packageAdmin/pages/activities/index',
        icon: 'activity',
        theme: 'orange',
      },
      {
        title: '招商意向',
        desc: '线索跟进 · 关联房源',
        url: '/packageAdmin/pages/investments/index',
        icon: 'investment',
        theme: 'purple',
      },
    ],
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

    const superAuth = require('../../../utils/superAuth')
    const user = parkAuth.getParkUser() || superAuth.getUser()
    this.setData({
      greeting: getGreeting(),
      dateText: formatDate(new Date()),
      parkName: user ? user.name : '园区人员',
      isSuperMode: superAuth.isSuperLoggedIn(),
    })
    this.loadStats()
  },

  onPullDownRefresh() {
    this.loadStats().finally(() => wx.stopPullDownRefresh())
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
    const { url } = e.currentTarget.dataset
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
    if (superAuth.isSuperLoggedIn() && !parkAuth.isParkLoggedIn()) {
      wx.showModal({
        title: '退出控制台',
        content: '确定退出系统管理控制台吗？',
        success: (res) => {
          if (!res.confirm) return
          const { superRequest } = require('../../../utils/request')
          superRequest('/super/logout', { method: 'POST' }).finally(() => {
            superAuth.clearToken()
            wx.reLaunch({ url: '/pages/mine/index' })
          })
        },
      })
      return
    }

    wx.showModal({
      title: '退出登录',
      content: '确定退出园区工作台吗？',
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
