const { request } = require('../../utils/request')
const { formatDateTime, formatDate } = require('../../utils/format')
const { getPendingEvents } = require('../../utils/vehicle')
const { requirePhoneVerified } = require('../../utils/user')
const nav = require('../../utils/nav')

Page({
  data: {
    statusBarHeight: 20,
    parkName: '康瑞园区',
    dateText: '',
    greeting: '您好',

    parkingStats: null,

    coreServices: [
      {
        id: 'appointment_hub',
        title: '服务预约',
        desc: '访客拜访 · 场馆 · 活动报备',
        icon: 'appointment',
        iconColor: '#0f766e',
        tone: 'teal',
      },
      {
        id: 'parking',
        title: '停车服务',
        desc: '余位查询 · 车辆入出场',
        icon: 'parking',
        iconColor: '#16a34a',
        tone: 'green',
      },
      {
        id: 'news_list',
        title: '园区资讯',
        desc: '公告通知 · 园区动态',
        icon: 'news',
        iconColor: '#d97706',
        tone: 'amber',
      },
    ],

    quickEntries: [
      { id: 'visitor', label: '访客预约', icon: 'visitor' },
      { id: 'venue', label: '场馆预定', icon: 'venue' },
      { id: 'houses', label: '园区房源', icon: 'house' },
      { id: 'investment', label: '招商意向', icon: 'investment' },
      { id: 'policies', label: '政策直达', icon: 'policy' },
      { id: 'activities', label: '园区活动', icon: 'activity' },
      { id: 'contact', label: '联系物业', icon: 'contact' },
      { id: 'more', label: '全部服务', icon: 'more' },
    ],

    notices: [],
    newsList: [],
    pendingCount: 0,
    pendingEvents: [],
  },

  onLoad() {
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.setData({ statusBarHeight: windowInfo.statusBarHeight || 20 })
    this.setDateText()
    this.loadParkingStats()
    this.loadNotices()
    this.loadNews()
  },

  onShow() {
    this.setDateText()
    this.loadParkingStats()
    this.loadPendingEvents()
    this.startPendingPoll()
  },

  onHide() {
    this.stopPendingPoll()
  },

  onUnload() {
    this.stopPendingPoll()
  },

  startPendingPoll() {
    this.stopPendingPoll()
    this.pendingTimer = setInterval(() => {
      this.loadPendingEvents()
    }, 30000)
  },

  stopPendingPoll() {
    if (this.pendingTimer) {
      clearInterval(this.pendingTimer)
      this.pendingTimer = null
    }
  },

  loadPendingEvents() {
    if (!requirePhoneVerified({ redirect: false, silent: true })) {
      this.setData({ pendingCount: 0, pendingEvents: [] })
      return
    }

    getPendingEvents()
      .then((data) => {
        const list = (data.list || []).map((item) => ({
          ...item,
          timeText: formatDateTime(item.recognition_time),
        }))
        this.setData({
          pendingCount: data.count || list.length,
          pendingEvents: list,
        })
      })
      .catch(() => {
        this.setData({ pendingCount: 0, pendingEvents: [] })
      })
  },

  onPendingTap(e) {
    const { id, direction } = e.currentTarget.dataset
    const url = direction === 2
      ? `/pages/parking/confirm-exit?event_id=${id}`
      : `/pages/parking/confirm-entry?event_id=${id}`
    wx.navigateTo({ url })
  },

  setDateText() {
    const hour = new Date().getHours()
    let greeting = '您好'
    if (hour < 12) greeting = '上午好'
    else if (hour < 18) greeting = '下午好'
    else greeting = '晚上好'

    this.setData({
      dateText: formatDate(new Date()),
      greeting,
    })
  },

  loadParkingStats() {
    request('/parking/remaining')
      .then((res) => {
        const data = res.data || {}
        const total = data.total_spots || 0
        const occupied = data.occupied_count || 0
        const remaining = data.remaining_spots || 0
        const percent = total > 0 ? Math.round((occupied / total) * 100) : 0
        this.setData({
          parkingStats: {
            ...data,
            percent,
            statusText: percent >= 90 ? '车位紧张' : percent >= 70 ? '余位较少' : '余位充足',
          },
        })
      })
      .catch(() => {
        this.setData({ parkingStats: null })
      })
  },

  loadNotices() {
    request('/news', { data: { type: 'notice', per_page: 5 } })
      .then((res) => {
        this.setData({ notices: (res.data.list || []).slice(0, 3) })
      })
      .catch(() => {
        this.setData({ notices: [] })
      })
  },

  loadNews() {
    request('/news', { data: { type: 'news', per_page: 4 } })
      .then((res) => {
        const list = (res.data.list || []).map((item) => ({
          id: item.id,
          title: item.title,
          timeText: formatDateTime(item.publish_time),
          isTop: !!item.is_top,
        }))
        this.setData({ newsList: list })
      })
      .catch(() => {
        this.setData({ newsList: [] })
      })
  },

  onCoreTap(e) {
    const { id } = e.currentTarget.dataset
    if (id === 'appointment_hub') {
      wx.navigateTo({ url: '/pages/appointment/index' })
      return
    }
    nav.go(id)
  },

  onParkingTap() {
    nav.go('parking')
  },

  onQuickTap(e) {
    nav.go(e.currentTarget.dataset.id)
  },

  onNoticeTap(e) {
    const { id } = e.currentTarget.dataset
    if (id) nav.go('news_detail', { id })
    else nav.go('news_list')
  },

  onNewsMore() {
    nav.go('news_more')
  },

  onNewsTap(e) {
    nav.go('news_detail', { id: e.currentTarget.dataset.id })
  },
})
