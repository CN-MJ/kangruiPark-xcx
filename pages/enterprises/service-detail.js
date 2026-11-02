const { request } = require('../../utils/request')
const { resolveMediaUrl, resolveMediaList, materializeMediaList } = require('../../utils/media')

Page({
  data: {
    detail: null,
    loading: true,
  },

  onLoad(options) {
    const id = options.id ? Number(options.id) : 0
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      this.setData({ loading: false })
      return
    }
    this.loadDetail(id)
  },

  loadDetail(id) {
    this.setData({ loading: true })
    request(`/enterprise-services/${id}`)
      .then((res) => {
        const raw = res.data || {}
        const remoteImages = resolveMediaList(
          (Array.isArray(raw.images) && raw.images.length)
            ? raw.images
            : (raw.cover ? [raw.cover] : [])
        )
        const detail = {
          ...raw,
          cover: remoteImages[0] || '',
          images: remoteImages.map((src, index) => ({ id: index, src })),
          price_text: raw.price_text || '面议',
          enterpriseCover: resolveMediaUrl(
            (raw.enterprise && (raw.enterprise.cover || '')) || ''
          ),
        }
        this.setData({ detail, loading: false })
        wx.setNavigationBarTitle({ title: detail.name || '服务详情' })

        if (!remoteImages.length) return null
        return materializeMediaList(remoteImages).then((localImages) => {
          const usable = (localImages || []).filter(Boolean)
          if (!usable.length) return
          detail.images = usable.map((src, index) => ({ id: index, src }))
          detail.cover = usable[0] || ''
          this.setData({ detail })
        })
      })
      .catch((err) => {
        this.setData({ loading: false, detail: null })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onPreview(e) {
    const urls = (this.data.detail && this.data.detail.images || []).map((i) => i.src).filter(Boolean)
    const url = e.currentTarget.dataset.url
    if (!urls.length || !url) return
    wx.previewImage({ current: url, urls })
  },

  onOpenEnterprise() {
    const ent = this.data.detail && this.data.detail.enterprise
    if (!ent || !ent.id) return
    wx.navigateTo({ url: `/pages/enterprises/detail?id=${ent.id}` })
  },

  onBook() {
    const d = this.data.detail
    if (!d || !d.id) return
    const entName = (d.enterprise && d.enterprise.name) || ''
    wx.navigateTo({
      url: `/pages/appointment/create?type=service&service_id=${d.id}&service_name=${encodeURIComponent(d.name || '')}&enterprise_name=${encodeURIComponent(entName)}`,
    })
  },
})
