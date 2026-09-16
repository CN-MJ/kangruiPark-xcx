const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { uploadImage } = require('../../../utils/upload')
const { applyParkNavTheme } = require('../../utils/navTheme')
const { materializeMediaUrl } = require('../../../utils/media')

Page({
  data: {
    id: '',
    name: '',
    title: '',
    phone: '',
    photo: '',
    photoLocal: '',
    sort_order: 0,
    is_show: true,
    submitting: false,
  },

  onLoad(options) {
    applyParkNavTheme()
    if (!parkAuth.canAccessParkAdmin() || !parkAuth.hasPermission('service_teams')) {
      wx.redirectTo({ url: '/packageAdmin/pages/home/index' })
      return
    }
    if (!options.id) return
    this.setData({ id: options.id })
    parkRequest(`/park/service-teams/${options.id}`).then((res) => {
      const d = res.data || {}
      this.setData({
        name: d.name || '',
        title: d.title || '',
        phone: d.phone || '',
        photo: d.photo || '',
        photoLocal: d.photo || '',
        sort_order: d.sort_order || 0,
        is_show: d.is_show !== false,
      })
      if (d.photo) {
        materializeMediaUrl(d.photo).then((local) => {
          if (local) this.setData({ photoLocal: local })
        })
      }
    })
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value })
  },

  onShowChange(e) {
    this.setData({ is_show: e.detail.value })
  },

  onChoosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const path = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath
        if (!path) return
        this.setData({ photoLocal: path })
        wx.showLoading({ title: '上传中' })
        uploadImage(path, { purpose: 'service_team' })
          .then((url) => this.setData({ photo: url, photoLocal: url }))
          .catch((err) => wx.showToast({ title: err.message || '上传失败', icon: 'none' }))
          .finally(() => wx.hideLoading())
      },
    })
  },

  onSubmit() {
    if (this.data.submitting) return
    const data = {
      name: (this.data.name || '').trim(),
      title: (this.data.title || '').trim(),
      phone: (this.data.phone || '').trim(),
      photo: this.data.photo || null,
      sort_order: Number(this.data.sort_order || 0),
      is_show: !!this.data.is_show,
    }
    if (!data.name || !data.title) {
      wx.showToast({ title: '请填写姓名和职务', icon: 'none' })
      return
    }
    const req = this.data.id
      ? parkRequest(`/park/service-teams/${this.data.id}`, { method: 'PUT', data })
      : parkRequest('/park/service-teams', { method: 'POST', data })
    this.setData({ submitting: true })
    req
      .then(() => {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 500)
      })
      .catch((err) => wx.showToast({ title: err.message || '保存失败', icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },
})
