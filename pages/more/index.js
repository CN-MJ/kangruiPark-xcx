const nav = require('../../utils/nav')

const SECTIONS = [
  {
    id: 'property',
    title: '物业服务',
    items: [
      { id: 'property', label: '物业服务', icon: '🛎', bg: '#fff0e8' },
      { id: 'parking', label: '停车服务', icon: '🅿', bg: '#e8f6ff' },
      { id: 'contact', label: '联系物业', icon: '☎', bg: '#eef4ff' },
      { id: 'feedback', label: '投诉建议', icon: '🎧', bg: '#f3eeff' },
    ],
  },
  {
    id: 'enterprise',
    title: '企业增值',
    items: [
      { id: 'enterprise', label: '企业增值', icon: '💼', bg: '#f3eeff' },
      { id: 'repair', label: 'IT报修', icon: '🔧', bg: '#e8f6ff' },
      { id: 'activity', label: '活动报备', icon: '📅', bg: '#fff8e8' },
      { id: 'news_list', label: '园区资讯', icon: '📰', bg: '#eef4ff' },
    ],
  },
  {
    id: 'life',
    title: '园区生活',
    items: [
      { id: 'nav', label: '综合导航', icon: '🧭', bg: '#ffece8' },
      { id: 'news_list', label: '新闻公告', icon: '📢', bg: '#fff3e8' },
      { id: 'checkin', label: '园区签到', icon: '✓', bg: '#e8faf2' },
      { id: 'order', label: '我的订单', icon: '📋', bg: '#eef4ff' },
    ],
  },
  {
    id: 'booking',
    title: '预约服务',
    items: [
      { id: 'venue', label: '场馆预定', icon: '🏢', bg: '#e8faf2' },
      { id: 'visitor', label: '访客预约', icon: '👤', bg: '#e8f6ff' },
      { id: 'activity', label: '活动报备', icon: '📅', bg: '#f3eeff' },
      { id: 'appointment_query', label: '预约查询', icon: '🔍', bg: '#fff8e8' },
    ],
  },
]

Page({
  data: {
    categories: SECTIONS.map((s) => ({ id: s.id, name: s.title })),
    sections: SECTIONS,
    activeId: 'property',
    scrollIntoView: '',
  },

  onReady() {
    wx.nextTick(() => {
      setTimeout(() => this.measureSections(), 50)
    })
  },

  /** 测量各区块在滚动容器内的偏移位置 */
  measureSections() {
    const query = wx.createSelectorQuery().in(this)
    query.selectAll('.section-block').boundingClientRect()
    query.exec((res) => {
      const rects = res[0]
      if (!rects || !rects.length) return
      const baseTop = rects[0].top
      this.sectionTops = rects.map((rect) => Math.max(0, rect.top - baseTop))
    })
  },

  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset
    this.tapping = true
    this.setData({
      activeId: id,
      scrollIntoView: `section-${id}`,
    })
    clearTimeout(this.tapTimer)
    this.tapTimer = setTimeout(() => {
      this.tapping = false
      this.setData({ scrollIntoView: '' })
    }, 400)
  },

  onContentScroll(e) {
    if (this.tapping || !this.sectionTops || !this.sectionTops.length) return

    const scrollTop = e.detail.scrollTop
    const anchor = scrollTop + 30
    let activeIndex = 0

    for (let i = this.sectionTops.length - 1; i >= 0; i -= 1) {
      if (anchor >= this.sectionTops[i]) {
        activeIndex = i
        break
      }
    }

    const activeId = SECTIONS[activeIndex].id
    if (activeId !== this.data.activeId) {
      this.setData({ activeId })
    }
  },

  onItemTap(e) {
    const { id } = e.currentTarget.dataset
    nav.go(id)
  },
})
