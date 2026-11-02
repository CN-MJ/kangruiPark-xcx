const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')

Page({
  data: {
    enterpriseId: 0,
    enterpriseName: '',
    list: [],
    loading: true,
    showForm: false,
    editingId: 0,
    form: { name: '', summary: '', price_text: '', description: '', status: 1 },
    submitting: false,
  },

  onLoad(options) {
    this.setData({
      enterpriseId: Number(options.enterprise_id || 0),
      enterpriseName: options.enterprise_name ? decodeURIComponent(options.enterprise_name) : '',
    })
    if (this.data.enterpriseName) {
      wx.setNavigationBarTitle({ title: `${this.data.enterpriseName} · 服务` })
    }
  },

  onShow() {
    if (!parkAuth.canAccessParkAdmin()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    this.loadList()
  },

  loadList() {
    if (!this.data.enterpriseId) {
      this.setData({ loading: false, list: [] })
      return
    }
    this.setData({ loading: true })
    parkRequest('/park/enterprise-services', {
      data: { enterprise_id: this.data.enterpriseId, per_page: 50 },
    })
      .then((res) => {
        this.setData({ list: (res.data && res.data.list) || [], loading: false })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  openCreate() {
    this.setData({
      showForm: true,
      editingId: 0,
      form: { name: '', summary: '', price_text: '', description: '', status: 1 },
    })
  },

  openEdit(e) {
    const id = Number(e.currentTarget.dataset.id)
    const item = this.data.list.find((i) => i.id === id)
    if (!item) return
    this.setData({
      showForm: true,
      editingId: id,
      form: {
        name: item.name || '',
        summary: item.summary || '',
        price_text: item.price_text || '',
        description: item.description || '',
        status: item.status,
      },
    })
  },

  closeForm() {
    this.setData({ showForm: false })
  },

  onField(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value })
  },

  onToggleStatus() {
    this.setData({ 'form.status': this.data.form.status === 1 ? 0 : 1 })
  },

  onSubmit() {
    if (this.data.submitting) return
    const { form, editingId, enterpriseId } = this.data
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写服务名称', icon: 'none' })
      return
    }
    const payload = {
      enterprise_id: enterpriseId,
      name: form.name.trim(),
      summary: (form.summary || '').trim() || null,
      price_text: (form.price_text || '').trim() || null,
      description: (form.description || '').trim() || null,
      status: form.status,
    }
    this.setData({ submitting: true })
    const req = editingId
      ? parkRequest(`/park/enterprise-services/${editingId}`, { method: 'PUT', data: payload })
      : parkRequest('/park/enterprise-services', { method: 'POST', data: payload })
    req
      .then(() => {
        wx.showToast({ title: '已保存', icon: 'success' })
        this.setData({ showForm: false })
        this.loadList()
      })
      .catch((err) => wx.showToast({ title: err.message || '保存失败', icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除服务',
      content: '确认删除？',
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/enterprise-services/${id}`, { method: 'DELETE' })
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadList()
          })
          .catch((err) => wx.showToast({ title: err.message || '删除失败', icon: 'none' }))
      },
    })
  },
})
