const { parkRequest, superRequest } = require('../../../utils/request')
const superAuth = require('../../../utils/superAuth')
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
    loading: true,
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
        title: '健康企业汇',
        desc: '走访企业录入与管理',
        url: '/packageAdmin/pages/enterprises/index',
        icon: 'merchants',
        theme: 'purple',
      },
      {
        title: '企业类型',
        desc: '大类小类配置',
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
        title: '服务团队',
        desc: '证件照 · 姓名职务电话',
        url: '/packageAdmin/pages/service-teams/index',
        icon: 'team',
        theme: 'blue',
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
      {
        title: '用户管理',
        desc: '申请审核 · 分配角色',
        url: '/packageAdmin/pages/staff/index',
        icon: 'merchants',
        theme: 'blue',
      },
      {
        title: '角色管理',
        desc: '配置每个角色能进入的工作台菜单',
        url: '/packageAdmin/pages/staff/roles',
        icon: 'policy',
        theme: 'green',
      },
      {
        title: '日志',
        desc: '操作留痕 · 只读不可改',
        url: '/packageAdmin/pages/logs/index',
        icon: 'order',
        theme: 'orange',
      },
    ],
  },

  onLoad() {
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.setData({ statusBarHeight: windowInfo.statusBarHeight || 20 })
  },

  onShow() {
    if (!superAuth.isSuperLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/x-console/gate' })
      return
    }

    const user = superAuth.getUser()
    this.setData({
      greeting: getGreeting(),
      dateText: formatDate(new Date()),
      parkName: user ? user.name : '系统管理员',
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
      .catch((err) => {
        this.setData({ loading: false })
        if ((err.message || '').includes('过期') || (err.message || '').includes('权限')) {
          superAuth.clearToken()
          wx.redirectTo({ url: '/packageAdmin/pages/x-console/gate' })
        }
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

  onLogout() {
    wx.showModal({
      title: '退出控制台',
      content: '仅退出超管控制台，微信个人登录会保留。',
      success: (res) => {
        if (!res.confirm) return
        superRequest('/super/logout', { method: 'POST' }).finally(() => {
          superAuth.clearToken()
          wx.reLaunch({ url: '/pages/mine/index' })
        })
      },
    })
  },
})
