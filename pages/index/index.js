const { request } = require('../../utils/request')
const { formatDateTime, formatDate } = require('../../utils/format')
const { getPendingEvents } = require('../../utils/vehicle')
const { requirePhoneVerified } = require('../../utils/user')
const { resolveMediaUrl, materializeMediaUrl } = require('../../utils/media')
const { DISTRICT_NAMES } = require('../../utils/ganzhouDistrict')
const nav = require('../../utils/nav')

function shortMajorName(name) {
  const text = String(name || '')
  const matched = text.match(/^(.+?)（(.+)）$/)
  return matched ? matched[1] : text
}

function majorTipName(name) {
  const text = String(name || '')
  const matched = text.match(/^(.+?)（(.+)）$/)
  return matched ? matched[2] : ''
}

const MAJOR_STYLES = [
  { bg: '#eef4ff', accent: '#003791' },
  { bg: '#ecfdf5', accent: '#0f766e' },
  { bg: '#fff7ed', accent: '#c2410c' },
  { bg: '#f0f9ff', accent: '#0369a1' },
  { bg: '#fefce8', accent: '#a16207' },
  { bg: '#fdf2f8', accent: '#9d174d' },
]

function mapEnterpriseCard(item) {
  const coverRemote = resolveMediaUrl(item.cover || (item.images && item.images[0]) || '')
  const intro = String(item.business_intro || '').replace(/\s+/g, ' ').trim()
  const categoryName = (item.primary_category && item.primary_category.name)
    ? shortMajorName(item.primary_category.name)
    : ''
  const tags = []
  if (item.service_audience_text) {
    tags.push({ text: item.service_audience_text, tone: 'tone-aud' })
  }
  ;(item.categories || []).slice(0, 2).forEach((c) => {
    if (c && c.name) tags.push({ text: c.name, tone: 'tone-cat' })
  })
  if (item.source_text) {
    tags.push({ text: item.source_text, tone: 'tone-src' })
  }
  return {
    id: item.id,
    name: item.name,
    coverRemote,
    cover: coverRemote || '/images/default-cover.jpg',
    categoryName,
    primaryCategoryId: item.primary_category ? item.primary_category.id : 0,
    settleInPark: !!item.settle_in_park,
    introPreview: intro.slice(0, 42),
    tags: tags.slice(0, 3),
  }
}

/** 尽量每个大类抽 1 家，再补足其余，体现多样性 */
function diversifyEnterprises(list, limit = 8) {
  const byMajor = {}
  const rest = []
  list.forEach((item) => {
    const key = item.primaryCategoryId || 0
    if (key && !byMajor[key]) byMajor[key] = item
    else rest.push(item)
  })
  const picked = Object.keys(byMajor).map((k) => byMajor[k])
  const merged = picked.concat(rest.filter((item) => picked.indexOf(item) === -1))
  return merged.slice(0, limit)
}

Page({
  data: {
    statusBarHeight: 20,
    dateText: '',
    greeting: '您好',

    // 蓝色头图上的快捷入口（白底图标块）
    heroActions: [
      { id: 'order', label: '我的订单', icon: 'order', iconColor: '#0047b3', bg: '#e8f0ff' },
      { id: 'houses', label: '房源中心', icon: 'house', iconColor: '#0d9488', bg: '#e6faf6' },
      { id: 'feedback', label: '投诉建议', icon: 'feedback', iconColor: '#d97706', bg: '#fff7ed' },
      { id: 'more', label: '全部服务', icon: 'more', iconColor: '#7c3aed', bg: '#f3e8ff' },
    ],

    // 白底区次级入口
    secondaryEntries: [
      { id: 'nav', label: '综合导航', icon: 'nav', iconColor: '#0047b3' },
      { id: 'service_team', label: '服务团队', icon: 'team', iconColor: '#003791' },
      { id: 'visitor', label: '访客预约', icon: 'visitor', iconColor: '#0d9488' },
      { id: 'repair', label: '报修服务', icon: 'repair', iconColor: '#ea580c' },
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
        id: 'venue',
        title: '场馆预定',
        desc: '场地预约 · 活动报备',
        icon: 'venue',
        iconColor: '#0d9488',
        tone: 'teal',
      },
      {
        id: 'investment',
        title: '招商服务',
        desc: '园区招商 · 入驻咨询',
        icon: 'investment',
        iconColor: '#0284c7',
        tone: 'sky',
      },
      {
        id: 'policies',
        title: '政策法规',
        desc: '园区政策 · 办事指南',
        icon: 'policy',
        iconColor: '#6366f1',
        tone: 'indigo',
      },
    ],

    enterpriseHome: {
      total: 0,
      settleTotal: 0,
      majorCount: 0,
      minorCount: 0,
      majors: [],
      audiences: [],
      districts: DISTRICT_NAMES,
      district: '',
      list: [],
      loading: true,
    },

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
    this.loadNotices()
    this.loadNews({ reset: true })
  },

  onShow() {
    this.setDateText()
    this.loadPendingEvents()
    this.loadEnterpriseHome()
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

  hydrateEnterpriseCovers(items) {
    items.forEach((item, index) => {
      const remote = item.coverRemote
      if (!remote) return
      materializeMediaUrl(remote).then((local) => {
        const current = this.data.enterpriseHome.list[index]
        if (!current || !local || local === current.cover) return
        this.setData({ [`enterpriseHome.list[${index}].cover`]: local })
      })
    })
  },

  loadEnterpriseHome() {
    const district = (this.data.enterpriseHome && this.data.enterpriseHome.district) || ''
    const filter = {}
    if (district) filter.district = district

    this.setData({ 'enterpriseHome.loading': true })

    Promise.all([
      request('/enterprise-categories'),
      request('/enterprise-districts').catch(() => ({ data: { list: [] } })),
      request('/enterprises', { data: { page: 1, per_page: 24, ...filter } }),
      request('/enterprises', { data: { page: 1, per_page: 1, settle_in_park: 1, ...filter } }),
      request('/enterprises', { data: { page: 1, per_page: 1, service_audience: 'c', ...filter } }),
      request('/enterprises', { data: { page: 1, per_page: 1, service_audience: 'b', ...filter } }),
      request('/enterprises', { data: { page: 1, per_page: 1, service_audience: 'bc', ...filter } }),
    ])
      .then(([catRes, districtRes, listRes, settleRes, audC, audB, audBc]) => {
        const rawMajors = (catRes.data.list || []).filter((m) => m.status !== 0)
        const majors = rawMajors.slice(0, 6).map((m, index) => {
          const style = MAJOR_STYLES[index % MAJOR_STYLES.length]
          const children = (m.children || []).filter((c) => c.status !== 0)
          return {
            id: m.id,
            name: shortMajorName(m.name),
            tip: majorTipName(m.name),
            fullName: m.name,
            minorCount: children.length,
            sampleMinors: children.slice(0, 2).map((c) => c.name),
            bg: style.bg,
            accent: style.accent,
          }
        })
        const minorCount = majors.reduce((sum, m) => sum + m.minorCount, 0)
        const pagination = (listRes.data && listRes.data.pagination) || {}
        const settleTotal = ((settleRes.data && settleRes.data.pagination) || {}).total || 0
        const mapped = diversifyEnterprises(
          ((listRes.data && listRes.data.list) || []).map(mapEnterpriseCard),
          8,
        )
        const audiences = [
          {
            value: 'c',
            label: '面向 C 端',
            count: ((audC.data && audC.data.pagination) || {}).total || 0,
          },
          {
            value: 'b',
            label: '面向 B 端',
            count: ((audB.data && audB.data.pagination) || {}).total || 0,
          },
          {
            value: 'bc',
            label: 'BC 兼顾',
            count: ((audBc.data && audBc.data.pagination) || {}).total || 0,
          },
          {
            value: 'settle',
            label: '园区入驻',
            count: settleTotal,
          },
        ]
        const apiDistricts = ((districtRes.data && districtRes.data.list) || [])
          .map((item) => item.name)
          .filter(Boolean)

        this.setData({
          enterpriseHome: {
            total: pagination.total || mapped.length,
            settleTotal,
            majorCount: majors.length,
            minorCount,
            majors,
            audiences,
            districts: apiDistricts.length ? apiDistricts : DISTRICT_NAMES,
            district,
            list: mapped,
            loading: false,
          },
        })
        this.hydrateEnterpriseCovers(mapped)
      })
      .catch(() => {
        this.setData({
          enterpriseHome: {
            ...this.data.enterpriseHome,
            total: 0,
            settleTotal: 0,
            majorCount: 0,
            minorCount: 0,
            majors: [],
            audiences: [],
            list: [],
            loading: false,
          },
        })
      })
  },

  enterpriseNavOptions(extra = {}) {
    const district = (this.data.enterpriseHome && this.data.enterpriseHome.district) || ''
    const options = { ...extra }
    if (district) options.district = district
    return options
  },

  onEnterpriseHomeTap() {
    nav.go('enterprises', this.enterpriseNavOptions())
  },

  onEnterpriseMajorTap(e) {
    const { id } = e.currentTarget.dataset
    if (id) nav.go('enterprises', this.enterpriseNavOptions({ major_id: id }))
    else nav.go('enterprises', this.enterpriseNavOptions())
  },

  onEnterpriseAudienceTap(e) {
    const { value } = e.currentTarget.dataset
    if (value === 'settle') {
      nav.go('enterprises', this.enterpriseNavOptions({ settle_in_park: 1 }))
      return
    }
    if (value) nav.go('enterprises', this.enterpriseNavOptions({ audience: value }))
    else nav.go('enterprises', this.enterpriseNavOptions())
  },

  onEnterpriseDistrictTap(e) {
    const name = e.currentTarget.dataset.name || ''
    const current = this.data.enterpriseHome.district || ''
    const district = current === name ? '' : name
    this.setData({ 'enterpriseHome.district': district })
    this.loadEnterpriseHome()
  },

  onEnterpriseItemTap(e) {
    const { id } = e.currentTarget.dataset
    if (id) nav.go('enterprise_detail', { id })
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

  onNoticeTap(e) {
    const { id } = e.currentTarget.dataset
    if (id) nav.go('news_detail', { id })
    else nav.go('news_list')
  },

  onNewsTap(e) {
    nav.go('news_detail', { id: e.currentTarget.dataset.id })
  },
})
