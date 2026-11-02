const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')

Page({
  data: {
    enterpriseId: 0,
    enterpriseName: '',
    contact_phone: '',
    contact_name: '',
    password: '',
    list: [],
    loading: true,
    submitting: false,
  },

  onLoad(options) {
    this.setData({
      enterpriseId: Number(options.enterprise_id || 0),
      enterpriseName: options.enterprise_name ? decodeURIComponent(options.enterprise_name) : '',
      contact_phone: options.contact_phone ? decodeURIComponent(options.contact_phone) : '',
      contact_name: options.contact_name ? decodeURIComponent(options.contact_name) : '',
    })
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
    parkRequest('/park/merchant-accounts', {
      data: { enterprise_id: this.data.enterpriseId },
    })
      .then((res) => {
        this.setData({ list: (res.data && res.data.list) || [], loading: false })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onField(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },

  onBind() {
    if (this.data.submitting) return
    const phone = (this.data.contact_phone || '').trim()
    if (!phone) {
      wx.showToast({ title: '请填写登录手机号', icon: 'none' })
      return
    }
    if (!this.data.enterpriseId) {
      wx.showToast({ title: '缺少企业信息，请从企业编辑页进入', icon: 'none' })
      return
    }
    const password = (this.data.password || '').trim()
    if (password && password.length < 6) {
      wx.showToast({ title: '初始密码至少 6 位', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    const data = {
      enterprise_id: this.data.enterpriseId,
      contact_phone: phone,
      contact_name: (this.data.contact_name || '').trim() || undefined,
      name: this.data.enterpriseName || undefined,
    }
    if (password) data.password = password
    parkRequest('/park/merchant-accounts', {
      method: 'POST',
      data,
    })
      .then(() => {
        wx.showToast({ title: '账号已就绪', icon: 'success' })
        this.setData({ password: '' })
        this.loadList()
      })
      .catch((err) => {
        const text = (err && err.message) || '绑定失败'
        wx.showModal({
          title: '绑定失败',
          content: text,
          showCancel: false,
        })
      })
      .finally(() => this.setData({ submitting: false }))
  },
})
