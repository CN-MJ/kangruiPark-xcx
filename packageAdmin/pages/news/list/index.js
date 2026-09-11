const { parkRequest } = require('../../../../utils/request')
const { formatDateTime } = require('../../../../utils/format')
const parkAuth = require('../../../../utils/parkAuth')

const FILTERS = [
  { key: 'all', label: '全部', type: '' },
  { key: 'news', label: '园区动态', type: 'news' },
  { key: 'notice', label: '首页公告', type: 'notice' },
  { key: 'top', label: '置顶', type: 'top' },
]

Page({
  data: {
    list: [],
    allList: [],
    loading: true,
    filters: FILTERS,
    activeFilter: 'all',
    total: 0,
  },

  onShow() {
    if (!parkAuth.canAccessParkAdmin()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    this.loadList()
  },

  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh())
  },

  loadList() {
    this.setData({ loading: true })
    const filter = FILTERS.find((f) => f.key === this.data.activeFilter)
    const params = {}
    if (filter && filter.type && filter.type !== 'top') {
      params.type = filter.type
    }

    return parkRequest('/park/news', { data: params })
      .then((res) => {
        const allList = (res.data.list || []).map((item) => ({
          ...item,
          timeText: formatDateTime(item.publish_time),
          summary: item.summary || '',
          hasCover: !!item.cover_image,
          isNotice: item.type === 'notice',
          typeText: item.type_text || (item.type === 'notice' ? '首页公告' : '园区动态'),
        }))
        this.setData({
          allList,
          total: res.data.pagination ? res.data.pagination.total : allList.length,
          loading: false,
        })
        this.applyFilter()
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  applyFilter() {
    const { allList, activeFilter } = this.data
    const list = activeFilter === 'top'
      ? allList.filter((item) => item.is_top)
      : allList
    this.setData({ list })
  },

  onFilterTap(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.activeFilter) return
    this.setData({ activeFilter: key })
    if (key === 'top') {
      this.loadList()
    } else {
      this.loadList()
    }
  },

  onCreate() {
    const { activeFilter } = this.data
    const type = activeFilter === 'notice' ? 'notice' : 'news'
    wx.navigateTo({ url: `/packageAdmin/pages/news/edit/index?type=${type}` })
  },

  onPreview(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/news/detail?id=${id}` })
  },

  onEdit(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/packageAdmin/pages/news/edit/index?id=${id}` })
  },

  onToggleTop(e) {
    const { id } = e.currentTarget.dataset
    parkRequest(`/park/news/${id}/top`, { method: 'PATCH' })
      .then((res) => {
        wx.showToast({ title: res.msg || '操作成功', icon: 'success' })
        this.loadList()
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '操作失败', icon: 'none' })
      })
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除确认',
      content: '删除后用户端将无法查看，确定删除吗？',
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/news/${id}`, { method: 'DELETE' })
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadList()
          })
          .catch((err) => {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          })
      },
    })
  },

  stopBubble() {},
})
