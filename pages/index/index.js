const { request } = require('../../utils/request')
const { formatDateTime, formatDate } = require('../../utils/format')
const nav = require('../../utils/nav')

const DEFAULT_AVATAR = '/images/default-avatar.jpg'
const DEFAULT_COVER = '/images/default-cover.jpg'

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    avatarUrl: DEFAULT_AVATAR,
    parkName: '康瑞园区',
    dateText: '',
    weatherText: '晴 28℃',

    quickActions: [
      { id: 'scan', label: '扫一扫', icon: '⊞', bg: 'rgba(255,255,255,0.95)' },
      { id: 'order', label: '订单', icon: '📋', bg: 'rgba(255,255,255,0.95)' },
      { id: 'checkin', label: '签到', icon: '✓', bg: 'rgba(255,255,255,0.95)' },
      { id: 'feedback', label: '投诉建议', icon: '🎧', bg: 'rgba(255,255,255,0.95)' },
    ],

    navItems: [
      { id: 'nav', label: '综合导航', icon: '🧭', bg: '#eef3ff' },
      { id: 'repair', label: 'IT报修', icon: '🔧', bg: '#fff3e8' },
      { id: 'visitor', label: '访客预约', icon: '👤', bg: '#e8f8f2' },
      { id: 'houses', label: '园区房源', icon: '🏠', bg: '#f3eeff' },
      { id: 'policies', label: '政策直达', icon: '📜', bg: '#fff8e9' },
    ],

    banner: {
      title: '智慧园区',
      subtitle: '一站式园区数字化服务平台',
      btnText: '立即体验',
    },

    notices: [],

    serviceCards: [
      {
        id: 'property',
        title: '物业服务',
        subtitle: '报修|在线咨询',
        icon: '🛎',
        bg: 'linear-gradient(145deg, #fff8f0 0%, #ffe8d4 100%)',
      },
      {
        id: 'parking',
        title: '停车服务',
        subtitle: '车位查询|预约入场',
        icon: '🅿',
        bg: 'linear-gradient(145deg, #eef8ff 0%, #d4ecff 100%)',
      },
      {
        id: 'venue',
        title: '场馆预定',
        subtitle: '会议室|活动场地',
        icon: '🏢',
        bg: 'linear-gradient(145deg, #eefaf4 0%, #d2f2e4 100%)',
      },
      {
        id: 'enterprise',
        title: '企业增值',
        subtitle: '赋能企业运营增值',
        icon: '💼',
        bg: 'linear-gradient(145deg, #f4efff 0%, #e4d8ff 100%)',
      },
    ],

    serviceSection: {
      title: '便民服务',
      subtitle: '园区基础服务',
    },

    serviceList: [
      { id: 'appointment_query', label: '预约查询', icon: '📋', bg: '#eef3ff' },
      { id: 'parking_query', label: '车位查询', icon: '🚗', bg: '#e8f8f2' },
      { id: 'news_list', label: '新闻公告', icon: '📢', bg: '#fff3e8' },
      { id: 'contact', label: '联系物业', icon: '☎', bg: '#f3eeff' },
      { id: 'visitor_reg', label: '访客登记', icon: '🪪', bg: '#e8f0ff' },
      { id: 'investment', label: '招商意向', icon: '🤝', bg: '#f5f5f5' },
      { id: 'activities', label: '园区活动', icon: '🎉', bg: '#eaf8ff' },
      { id: 'merchant_login', label: '商户工作台', icon: '🏬', bg: '#ede9ff' },
      { id: 'more_service', label: '更多服务', icon: '➕', bg: '#f5f5f5' },
    ],

    newsSection: {
      title: '园区动态',
    },

    newsList: [],
    defaultCover: DEFAULT_COVER,
  },

  onLoad() {
    this.initNavBar()
    this.setDateText()
    this.loadNotices()
    this.loadNews()
  },

  onShow() {
    this.setDateText()
  },

  onLocationTap() {
    nav.go('nav')
  },

  initNavBar() {
    const systemInfo = wx.getSystemInfoSync()
    const menuButton = wx.getMenuButtonBoundingClientRect()
    const statusBarHeight = systemInfo.statusBarHeight || 20
    const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height

    this.setData({
      statusBarHeight,
      navBarHeight: navBarHeight > 0 ? navBarHeight : 44,
    })
  },

  setDateText() {
    this.setData({
      dateText: formatDate(new Date()),
    })
  },

  loadNotices() {
    request('/news', { data: { type: 'notice', per_page: 10 } })
      .then((res) => {
        const notices = (res.data.list || []).map((item) => ({
          id: item.id,
          text: item.title,
        }))
        this.setData({ notices })
      })
      .catch(() => {
        this.setData({ notices: [] })
      })
  },

  loadNews() {
    request('/news', { data: { type: 'news', per_page: 10 } })
      .then((res) => {
        const list = (res.data.list || []).map((item) => ({
          id: item.id,
          title: item.title,
          cover_image: item.cover_image,
          timeText: formatDateTime(item.publish_time),
          tag: item.is_top ? '置顶' : '园区动态',
          meta: '查看详情',
        }))
        this.setData({ newsList: list })
      })
      .catch(() => {
        this.setData({ newsList: [] })
      })
  },

  onQuickAction(e) {
    const { action } = e.currentTarget.dataset
    if (action === 'scan') {
      wx.scanCode({ fail: () => {} })
      return
    }
    nav.go(action)
  },

  onNavTap(e) {
    const { action } = e.currentTarget.dataset
    nav.go(action)
  },

  onBannerTap() {
    nav.go('enterprise')
  },

  onNoticeTap() {
    nav.go('news_list')
  },

  onNoticeItemTap(e) {
    const { id } = e.currentTarget.dataset
    if (id) {
      nav.go('news_detail', { id })
    }
  },

  onServiceCardTap(e) {
    const { action } = e.currentTarget.dataset
    nav.go(action)
  },

  onServiceListTap(e) {
    const { action } = e.currentTarget.dataset
    nav.go(action)
  },

  onNewsMore() {
    nav.go('news_more')
  },

  onNewsTap(e) {
    const { id } = e.currentTarget.dataset
    nav.go('news_detail', { id })
  },
})
