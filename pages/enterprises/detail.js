const { request } = require('../../utils/request')
const { resolveMediaUrl, resolveMediaList, materializeMediaList, materializeMediaUrl } = require('../../utils/media')

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

  onImageError(e) {
    const src = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.url
    console.warn('[图片] image 组件加载失败', { src, err: e.detail })
  },

  hydrateServiceCovers(services) {
    ;(services || []).forEach((svc, index) => {
      const remote = svc.coverRemote
      if (!remote) return
      materializeMediaUrl(remote).then((local) => {
        if (!local || local === svc.cover) return
        this.setData({ [`detail.services[${index}].cover`]: local })
      })
    })
  },

  loadDetail(id) {
    this.setData({ loading: true })
    request(`/enterprises/${id}`)
      .then((res) => {
        const detail = res.data || {}
        const rawImages = (Array.isArray(detail.images) && detail.images.length)
          ? detail.images
          : (detail.cover ? [detail.cover] : [])
        const remoteImages = resolveMediaList(rawImages)
        detail.images = remoteImages.map((src, index) => ({ id: index, src }))
        detail.cover = remoteImages[0] || ''
        detail.galleryLoading = !!remoteImages.length
        detail.services = (detail.services || []).map((svc) => {
          const coverRemote = resolveMediaUrl(svc.cover || (svc.images && svc.images[0]) || '')
          return {
            ...svc,
            coverRemote,
            cover: coverRemote || '/images/default-cover.jpg',
            price_text: svc.price_text || '面议',
          }
        })
        this.setData({ detail, loading: false })
        this.hydrateServiceCovers(detail.services)

        if (!remoteImages.length) return null
        return materializeMediaList(remoteImages).then((localImages) => {
          const usable = (localImages || []).filter(Boolean)
          if (!usable.length) return
          detail.images = usable.map((src, index) => ({ id: index, src }))
          detail.cover = usable[0] || ''
          detail.galleryLoading = false
          this.setData({ detail })
        })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onPreview(e) {
    const urls = (this.data.detail && this.data.detail.images || []).map((item) => item.src).filter(Boolean)
    const url = e.currentTarget.dataset.url
    if (!urls.length || !url) return
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

  onServiceDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/enterprises/service-detail?id=${id}` })
  },

  onBookService(e) {
    const { id, name } = e.currentTarget.dataset
    if (!id) return
    const ent = this.data.detail || {}
    wx.navigateTo({
      url: `/pages/appointment/create?type=service&service_id=${id}&service_name=${encodeURIComponent(name || '')}&enterprise_name=${encodeURIComponent(ent.name || '')}`,
    })
  },
})
