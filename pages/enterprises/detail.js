const { request } = require('../../utils/request')
const { resolveMediaList, materializeMediaList } = require('../../utils/media')

Page({
  data: {
    detail: null,
    loading: true,
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    this.loadDetail(options.id)
  },

  loadDetail(id) {
    this.setData({ loading: true })
    request(`/enterprises/${id}`)
      .then((res) => {
        const detail = res.data || {}
        const remoteImages = resolveMediaList(detail.images || [])
        detail.images = remoteImages
        detail.cover = remoteImages[0] || detail.cover || ''
        this.setData({ detail, loading: false })
        return materializeMediaList(remoteImages).then((localImages) => {
          if (!localImages.length) return
          this.setData({
            'detail.images': localImages,
            'detail.cover': localImages[0] || '',
          })
        })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onPreview(e) {
    const { url } = e.currentTarget.dataset
    const urls = (this.data.detail && this.data.detail.images) || []
    if (!urls.length) return
    wx.previewImage({ current: url, urls })
  },

  onOpenMap() {
    const d = this.data.detail
    if (!d || !d.map_enabled || d.latitude == null || d.longitude == null) {
      wx.showToast({ title: '暂无地图定位', icon: 'none' })
      return
    }
    wx.openLocation({
      latitude: Number(d.latitude),
      longitude: Number(d.longitude),
      name: d.name,
      address: d.address || '',
      scale: 16,
    })
  },

  onCall() {
    const phone = this.data.detail && this.data.detail.contact_phone
    if (!phone) {
      wx.showToast({ title: '暂无联系电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: String(phone) })
  },
})
