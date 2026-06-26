const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')

Page({
  data: { list: [], status: '', page: 1, hasMore: true, loading: false },
  onShow() {
    if (!parkAuth.isParkLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    this.loadList()
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList(true)
  },
  onStatusChange(e) {
    this.setData({ status: e.detail.value, page: 1, list: [], hasMore: true })
    this.loadList()
  },
  loadList(loadMore = false) {
    if (this.data.loading) return
    const page = loadMore ? this.data.page + 1 : 1
    const params = {}
    if (this.data.status !== '') params.status = this.data.status
    params.page = page
    this.setData({ loading: true })
    parkRequest('/park/houses', { data: params }).then((res) => {
      const payload = res.data || {}
      const rows = payload.data || []
      this.setData({
        list: loadMore ? this.data.list.concat(rows) : rows,
        page,
        hasMore: page < (payload.last_page || 1),
        loading: false,
      })
    }).catch(() => this.setData({ loading: false }))
  },
  onCreate() {
    wx.navigateTo({ url: '/packageAdmin/pages/houses/edit' })
  },
  onEdit(e) {
    wx.navigateTo({ url: `/packageAdmin/pages/houses/edit?id=${e.currentTarget.dataset.id}` })
  },
  onDelete(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除房源',
      content: '确定删除该房源吗？',
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
