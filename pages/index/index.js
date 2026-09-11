const { request } = require('../../utils/request')
const { formatDateTime, formatDate } = require('../../utils/format')
const { getPendingEvents } = require('../../utils/vehicle')
const { requirePhoneVerified } = require('../../utils/user')
const nav = require('../../utils/nav')

Page({
  data: {
    statusBarHeight: 20,
    dateText: '',
    greeting: '您好',

    parkingStats: null,

    // 蓝色头图上的快捷入口（白底图标块）
    heroActions: [
      { id: 'order', label: '我的订单', icon: 'order', iconColor: '#0047b3', bg: '#e8f0ff' },
      { id: 'enterprises', label: '企业库', icon: 'merchants', iconColor: '#0d9488', bg: '#e6faf6' },
      { id: 'feedback', label: '投诉建议', icon: 'feedback', iconColor: '#d97706', bg: '#fff7ed' },
      { id: 'more', label: '全部服务', icon: 'more', iconColor: '#7c3aed', bg: '#f3e8ff' },
    ],

    // 白底区次级入口
    secondaryEntries: [
      { id: 'nav', label: '综合导航', icon: 'nav', iconColor: '#0047b3' },
      { id: 'repair', label: 'IT报修', icon: 'repair', iconColor: '#2563eb' },
      { id: 'visitor', label: '访客预约', icon: 'visitor', iconColor: '#003791' },
      { id: 'parking', label: '停车服务', icon: 'parking', iconColor: '#16a34a' },
    ],

    // 服务大卡片
    serviceCards: [
      {
        id: 'property',
        title: '物业服务',
        desc: '报修 · 建议 · 联系物业',
        icon: 'property',
        iconColor: '#0047b3',
        tone: 'blue',
      },
      {
        id: 'parking',
        title: '停车服务',
        desc: '余位查询 · 车辆进出',
        icon: 'parking',
        iconColor: '#0284c7',
        tone: 'sky',
      },
      {
        id: 'venue',
        title: '场馆预定',
        desc: '场地预约 · 活动报备',
        icon: 'venue',
        iconColor: '#0d9488',
        tone: 'teal',
      },
      {
        id: 'enterprises',
        title: '企业库',
        desc: '按大类 · 小类筛选企业',
        icon: 'merchants',
        iconColor: '#6366f1',
        tone: 'indigo',
      },
    ],

    notices: [],
    newsList: [],
    newsPage: 1,
    newsHasMore: true,
    newsLoading: false,
    newsLoadingMore: false,
    pendingCount: 0,
    pendingEvents: [],
  },

  onLoad() {
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.setData({ statusBarHeight: windowInfo.statusBarHeight || 20 })
    this.setDateText()
    this.loadParkingStats()
    this.loadNotices()
    this.loadNews({ reset: true })
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
      .catch((err) => {
        this.setData({ notices: [] })
        console.warn('loadNotices failed', err)
      })
  },

  loadNews({ reset = false } = {}) {
    if (this.data.newsLoading || this.data.newsLoadingMore) return
    if (!reset && !this.data.newsHasMore) return

    const page = reset ? 1 : this.data.newsPage
    const loadingKey = reset || this.data.newsList.length === 0 ? 'newsLoading' : 'newsLoadingMore'

    this.setData({ [loadingKey]: true })

    request('/news', { data: { type: 'news', page, per_page: 10 } })
      .then((res) => {
        const payload = res.data || {}
        const mapped = (payload.list || []).map((item) => ({
          id: item.id,
          title: item.title,
          timeText: formatDateTime(item.publish_time),
          isTop: !!item.is_top,
        }))
        const pagination = payload.pagination || {}
        const currentPage = pagination.current_page || page
        const lastPage = pagination.last_page || currentPage
        const newsList = reset ? mapped : this.data.newsList.concat(mapped)

        this.setData({
          newsList,
          newsPage: currentPage + 1,
          newsHasMore: currentPage < lastPage,
          newsLoading: false,
          newsLoadingMore: false,
        })
      })
      .catch((err) => {
        this.setData({
          newsLoading: false,
          newsLoadingMore: false,
          ...(reset ? { newsList: [], newsHasMore: false } : {}),
        })
        if (reset) {
          wx.showToast({ title: err.message || '动态加载失败', icon: 'none' })
        }
      })
  },

  onScrollToLower() {
    this.loadNews()
  },

  onHeroTap(e) {
    nav.go(e.currentTarget.dataset.id)
  },

  onSecondaryTap(e) {
    nav.go(e.currentTarget.dataset.id)
  },

  onServiceTap(e) {
    nav.go(e.currentTarget.dataset.id)
  },

  onParkingTap() {
    nav.go('parking')
  },

  onNoticeTap(e) {
    const { id } = e.currentTarget.dataset
    if (id) nav.go('news_detail', { id })
    else nav.go('news_list')
  },

  onNewsTap(e) {
    nav.go('news_detail', { id: e.currentTarget.dataset.id })
  },
})
