const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { uploadImage } = require('../../../utils/upload')
const { applyParkNavTheme } = require('../../utils/navTheme')
const { materializeMediaUrl, isLocalImagePath } = require('../../../utils/media')

function pickLocalImage() {
  return new Promise((resolve, reject) => {
    const done = (path) => {
      if (path) resolve(path)
      else reject(new Error('未获取到图片路径'))
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = (res.tempFiles || [])[0] || {}
        done(file.tempFilePath || file.path || '')
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('cancel') !== -1) {
          reject(new Error('cancel'))
          return
        }
        // 部分基础库/环境 chooseMedia 异常时回退
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: (r) => done((r.tempFilePaths || [])[0] || ''),
          fail: (e2) => {
            const m2 = (e2 && e2.errMsg) || ''
            if (m2.indexOf('cancel') !== -1) reject(new Error('cancel'))
            else reject(new Error((err && err.errMsg) || (e2 && e2.errMsg) || '选择图片失败'))
          },
        })
      },
    })
  })
}

Page({
  data: {
    id: '',
    name: '',
    title: '',
    phone: '',
    photo: '',
    photoLocal: '',
    photoDirty: false,
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
    this._photoLoadToken = 0
    if (!options.id) return
    this.setData({ id: options.id })
    const loadToken = Date.now()
    this._photoLoadToken = loadToken
    parkRequest(`/park/service-teams/${options.id}`).then((res) => {
      if (this._photoLoadToken !== loadToken) return
      const d = res.data || {}
      this.setData({
        name: d.name || '',
        title: d.title || '',
        phone: d.phone || '',
        photo: d.photo || '',
        photoLocal: d.photo || '',
        photoDirty: false,
        sort_order: d.sort_order || 0,
        is_show: d.is_show !== false,
      })
      if (d.photo) {
        materializeMediaUrl(d.photo).then((local) => {
          // 用户已重新选图时，禁止旧图异步结果覆盖预览
          if (this._photoLoadToken !== loadToken || this.data.photoDirty) return
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

  onPhotoError() {
    // 远程旧图失效时不要清掉刚选的本地预览
    if (this.data.photoDirty) return
    if (this.data.photoLocal) {
      this.setData({ photoLocal: '' })
    }
  },

  onChoosePhoto() {
    pickLocalImage()
      .then((path) => {
        // 作废进行中的旧图落地，避免盖住新预览
        this._photoLoadToken = Date.now()
        this.setData({
          photoLocal: path,
          photo: '',
          photoDirty: true,
        })
      })
      .catch((err) => {
        if (err && err.message === 'cancel') return
        wx.showToast({ title: (err && err.message) || '选择图片失败', icon: 'none' })
      })
  },

  onSubmit() {
    if (this.data.submitting) return
    const name = (this.data.name || '').trim()
    const title = (this.data.title || '').trim()
    if (!name || !title) {
      wx.showToast({ title: '请填写姓名和职务', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    const needUpload = this.data.photoDirty && this.data.photoLocal && isLocalImagePath(this.data.photoLocal)

    const uploadStep = needUpload
      ? Promise.resolve()
        .then(() => {
          wx.showLoading({ title: '上传证件照', mask: true })
          return uploadImage(this.data.photoLocal, { purpose: 'service_team' })
        })
        .then((url) => {
          this.setData({ photo: url, photoDirty: false })
          return url
        })
      : Promise.resolve(this.data.photo || null)

    uploadStep
      .then((photo) => {
        wx.showLoading({ title: '保存中', mask: true })
        const data = {
          name,
          title,
          phone: (this.data.phone || '').trim(),
          photo: photo || null,
          sort_order: Number(this.data.sort_order || 0),
          is_show: !!this.data.is_show,
        }
        return this.data.id
          ? parkRequest(`/park/service-teams/${this.data.id}`, { method: 'PUT', data })
          : parkRequest('/park/service-teams', { method: 'POST', data })
      })
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 500)
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ submitting: false })
        wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
      })
      .then(() => {
        // navigateBack 后可能已卸载
        try { this.setData({ submitting: false }) } catch (e) {}
      })
  },
})
