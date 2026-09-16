const { request } = require('../../utils/request')
const { materializeMediaUrl } = require('../../utils/media')

Page({
  data: {
    list: [],
    loading: true,
  },

  onShow() {
    this.loadList()
  },

  hydratePhotos(rows) {
    rows.forEach((item, index) => {
      if (!item.photo) return
      materializeMediaUrl(item.photo).then((local) => {
        const current = this.data.list[index]
        if (!current || !local || local === current.photoLocal) return
        this.setData({ [`list[${index}].photoLocal`]: local })
      })
    })
  },

  loadList() {
    this.setData({ loading: true })
    request('/service-teams')
      .then((res) => {
        const rows = ((res.data && res.data.list) || [])
          .slice()
          .sort((a, b) => {
            const sa = Number(a.sort_order || 0)
            const sb = Number(b.sort_order || 0)
            if (sa !== sb) return sa - sb
            return Number(a.id || 0) - Number(b.id || 0)
          })
          .map((item) => ({
            ...item,
            photoLocal: item.photo || '/images/default-avatar.jpg',
          }))
        this.setData({ list: rows, loading: false })
        this.hydratePhotos(rows)
      })
      .catch(() => this.setData({ list: [], loading: false }))
  },

  onCall(e) {
    const phone = e.currentTarget.dataset.phone
    if (!phone) {
      wx.showToast({ title: '暂无电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: String(phone) })
  },
})
