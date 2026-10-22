const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { applyParkNavTheme } = require('../../utils/navTheme')
const { HOUSE_LEASE_FILTER, HOUSE_MARKET_FILTER } = require('../../utils/cms')

Page({
  data: {
    list: [],
    leaseTabs: HOUSE_LEASE_FILTER,
    leaseFilterIndex: 0,
    leaseFilter: 'all',
    marketTabs: HOUSE_MARKET_FILTER.map((item) => item.label),
    marketFilterIndex: 0,
    marketFilter: 'all',
    page: 1,
    hasMore: true,
    loading: false,
  },

  onShow() {
    applyParkNavTheme()
    if (!parkAuth.canAccessParkAdmin()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    this.loadList()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList(true)
  },

  onLeaseFilter(e) {
    const index = Number(e.detail.value)
    const item = HOUSE_LEASE_FILTER[index] || HOUSE_LEASE_FILTER[0]
    this.setData({
      leaseFilterIndex: index,
      leaseFilter: item.value,
      page: 1,
      list: [],
      hasMore: true,
    })
    this.loadList()
  },

  onMarketFilter(e) {
    const index = Number(e.detail.value)
    const item = HOUSE_MARKET_FILTER[index] || HOUSE_MARKET_FILTER[0]
    this.setData({
      marketFilterIndex: index,
      marketFilter: item.value,
      page: 1,
      list: [],
      hasMore: true,
    })
    this.loadList()
  },

  loadList(loadMore = false) {
    if (this.data.loading) return
    const page = loadMore ? this.data.page + 1 : 1
    const params = { page }
    if (this.data.leaseFilter && this.data.leaseFilter !== 'all') {
      params.lease_sale_status = this.data.leaseFilter
    }
    if (this.data.marketFilter && this.data.marketFilter !== 'all') {
      params.status = this.data.marketFilter
    }

    this.setData({ loading: true })
    parkRequest('/park/houses', { data: params })
      .then((res) => {
        const payload = res.data || {}
        const rows = (payload.data || []).map((item) => ({
          ...item,
          displayTitle: item.title || `${item.building_no || ''}栋 ${item.room_no || ''}`,
          metaText: [
            item.floor_label || (item.floor != null ? `${item.floor}层` : ''),
            item.floor_height != null ? `层高${item.floor_height}m` : '',
            item.building_area_text || item.area || '',
            item.house_type || '',
          ].filter(Boolean).join(' · '),
          toneClass: `tone-${item.lease_sale_tone || 'blue'}`,
          marketText: item.status === 1 ? '已上架' : '已下架',
        }))
        this.setData({
          list: loadMore ? this.data.list.concat(rows) : rows,
          page,
          hasMore: page < (payload.last_page || 1),
          loading: false,
        })
      })
      .catch(() => this.setData({ loading: false }))
  },

  onCreate() {
    wx.navigateTo({ url: '/packageAdmin/pages/houses/edit' })
  },

  onEdit(e) {
    wx.navigateTo({ url: `/packageAdmin/pages/houses/edit?id=${e.currentTarget.dataset.id}` })
  },

  onViewIntents(e) {
    const { id, title } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/packageAdmin/pages/investments/index?house_id=${id}&house_title=${encodeURIComponent(title || '')}`,
    })
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除房源',
      content: '确定删除该房源吗？关联招商意向将保留但不再显示房源名称。',
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/houses/${id}`, { method: 'DELETE' }).then(() => {
          wx.showToast({ title: '已删除', icon: 'success' })
          this.setData({ page: 1, list: [], hasMore: true })
          this.loadList()
        })
      },
    })
  },
})
