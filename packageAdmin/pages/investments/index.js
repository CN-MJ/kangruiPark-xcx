const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')

Page({
  data: { list: [], statuses: ['待联系', '已联系', '意向强', '已成交', '无效'], page: 1, hasMore: true, loading: false },
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
    parkRequest('/park/investments', { data: { page } }).then((res) => {
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
  onStatusChange(e) {
    const { id } = e.currentTarget.dataset
    const status = Number(e.detail.value)
    parkRequest(`/park/investments/${id}/status`, { method: 'PATCH', data: { status } })
      .then(() => {
        wx.showToast({ title: '状态已更新', icon: 'success' })
        this.loadList()
      })
      .catch((err) => wx.showToast({ title: err.message || '更新失败', icon: 'none' }))
  },
})
