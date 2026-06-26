const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')

Page({
  data: { list: [], page: 1, hasMore: true, loading: false },
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
  loadList(loadMore = false) {
    if (this.data.loading) return
    const page = loadMore ? this.data.page + 1 : 1
    this.setData({ loading: true })
    parkRequest('/park/activities', { data: { page } }).then((res) => {
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
  onCreate() { wx.navigateTo({ url: '/packageAdmin/pages/activities/edit' }) },
  onEdit(e) { wx.navigateTo({ url: `/packageAdmin/pages/activities/edit?id=${e.currentTarget.dataset.id}` }) },
  onDelete(e) {
    parkRequest(`/park/activities/${e.currentTarget.dataset.id}`, { method: 'DELETE' }).then(() => {
      wx.showToast({ title: '已删除', icon: 'success' })
      this.setData({ page: 1, list: [], hasMore: true })
      this.loadList()
    })
  },
})
