const { merchantRequest } = require('../../utils/request')

Page({
  data: { list: [] },
  onShow() {
    this.loadList()
  },
  loadList() {
    merchantRequest('/merchant/appointments')
      .then((res) => this.setData({ list: res.data.list || [] }))
      .catch((err) => wx.showToast({ title: err.message || '加载失败', icon: 'none' }))
  },
  onAction(e) {
    const { id, action } = e.currentTarget.dataset
    const url = `/merchant/appointments/${id}/${action}`
    merchantRequest(url, { method: 'PATCH' })
      .then(() => {
        wx.showToast({ title: action === 'confirm' ? '已确认' : '已拒绝', icon: 'success' })
        this.loadList()
      })
      .catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
  },
})
