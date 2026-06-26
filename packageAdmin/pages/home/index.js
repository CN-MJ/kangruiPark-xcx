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
    greeting: '',
    dateText: '',
    parkName: '',
    stats: null,
    loading: true,
    menus: [
      {
        title: '预约管理',
        desc: '查看与处理访客预约',
        url: '/packageAdmin/pages/appointments/index',
        icon: '📋',
        theme: 'blue',
      },
      {
        title: '停车管理',
        desc: '车辆进出与余位',
        url: '/packageAdmin/pages/parking/index',
        icon: '🅿️',
        theme: 'green',
      },
      {
        title: '新闻管理',
        desc: '园区动态与首页公告',
        url: '/packageAdmin/pages/news/list/index',
        icon: '📰',
        theme: 'orange',
      },
      {
        title: '商户管理',
        desc: '入住签到与人员',
        url: '/packageAdmin/pages/merchants/index',
        icon: '🏢',
        theme: 'purple',
      },
      {
        title: '房源管理',
        desc: '招商房源维护',
        url: '/packageAdmin/pages/houses/index',
        icon: '🏠',
        theme: 'blue',
      },
      {
        title: '政策管理',
        desc: '扶持政策发布',
        url: '/packageAdmin/pages/policies/index',
        icon: '📜',
        theme: 'green',
      },
      {
        title: '活动管理',
        desc: '园区活动与报名',
        url: '/packageAdmin/pages/activities/index',
        icon: '🎉',
        theme: 'orange',
      },
      {
        title: '招商意向',
        desc: '线索跟进转化',
        url: '/packageAdmin/pages/investments/index',
        icon: '🤝',
        theme: 'purple',
      },
    ],
  },

  onShow() {
    if (!parkAuth.isParkLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }

    const user = parkAuth.getParkUser()
    this.setData({
      greeting: getGreeting(),
      dateText: formatDate(new Date()),
      parkName: user ? user.name : '园区人员',
    })
    this.loadStats()
  },

  onPullDownRefresh() {
    this.loadStats().finally(() => wx.stopPullDownRefresh())
  },

  loadStats() {
    this.setData({ loading: true })
    return parkRequest('/park/dashboard')
      .then((res) => {
        this.setData({ stats: res.data, loading: false })
      })
      .catch(() => {
        this.setData({ loading: false })
      })
  },

  onMenuTap(e) {
    const { url } = e.currentTarget.dataset
    wx.navigateTo({ url })
  },

  onLogout() {
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
