const { merchantRequest } = require('../../utils/request')
const merchantAuth = require('../../utils/merchantAuth')

Page({
  data: {
    id: '',
    name: '',
    summary: '',
    description: '',
    price_text: '',
    status: 1,
    statusOptions: [
      { value: 1, label: '上架' },
      { value: 0, label: '下架' },
    ],
    statusIndex: 0,
    submitting: false,
  },

  onLoad(options) {
    if (!merchantAuth.isMerchantLoggedIn()) {
      wx.redirectTo({ url: '/pages/merchant/login' })
      return
    }
    if (options.id) {
      this.setData({ id: options.id })
      wx.setNavigationBarTitle({ title: '编辑服务' })
      this.loadDetail(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '发布服务' })
    }
  },

  loadDetail(id) {
    merchantRequest('/merchant/services')
      .then((res) => {
        const list = (res.data && res.data.list) || []
        const item = list.find((s) => String(s.id) === String(id))
        if (!item) {
          wx.showToast({ title: '服务不存在', icon: 'none' })
          return
        }
        const statusIndex = item.status === 0 ? 1 : 0
        this.setData({
          name: item.name || '',
          summary: item.summary || '',
          description: item.description || '',
          price_text: item.price_text || '',
          status: item.status,
          statusIndex,
        })
      })
      .catch((err) => wx.showToast({ title: err.message || '加载失败', icon: 'none' }))
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  onStatusChange(e) {
    const index = Number(e.detail.value)
    const opt = this.data.statusOptions[index]
    this.setData({ statusIndex: index, status: opt.value })
  },

  onSubmit() {
    if (this.data.submitting) return
    const name = (this.data.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请填写服务名称', icon: 'none' })
      return
    }

    const payload = {
      name,
      summary: (this.data.summary || '').trim() || null,
      description: (this.data.description || '').trim() || null,
      price_text: (this.data.price_text || '').trim() || null,
      status: this.data.status,
    }

    this.setData({ submitting: true })
    const isEdit = !!this.data.id
    const req = isEdit
      ? merchantRequest(`/merchant/services/${this.data.id}`, { method: 'PUT', data: payload })
      : merchantRequest('/merchant/services', { method: 'POST', data: payload })

    req
      .then((res) => {
        wx.showToast({ title: res.msg || '已保存', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1200)
      })
      .catch((err) => wx.showToast({ title: err.message || '保存失败', icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },
})
