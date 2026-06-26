const { parkRequest } = require('../../../utils/request')
const { uploadImage } = require('../../../utils/upload')

Page({
  data: {
    id: '',
    title: '',
    area: '',
    price: '',
    house_type: '',
    description: '',
    image: '',
    status: 1,
    sort_order: 0,
    submitting: false,
  },
  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      parkRequest(`/park/houses/${options.id}`).then((res) => {
        const d = res.data
        this.setData({ ...d, image: (d.images && d.images[0]) || '' })
      })
    }
  },
  onInput(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value })
  },
  onStatusChange(e) {
    this.setData({ status: Number(e.detail.value) })
  },
  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const file = res.tempFiles[0].tempFilePath
        uploadImage(file).then((url) => this.setData({ image: url }))
      },
    })
  },
  onSubmit() {
    if (this.data.submitting) return
    const data = {
      title: this.data.title.trim(),
      area: this.data.area.trim(),
      price: this.data.price.trim(),
      house_type: this.data.house_type.trim(),
      description: this.data.description.trim(),
      images: this.data.image ? [this.data.image] : [],
      status: this.data.status,
      sort_order: Number(this.data.sort_order || 0),
    }
    if (!data.title || !data.area || !data.price || !data.house_type || !data.description) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    const req = this.data.id
      ? parkRequest(`/park/houses/${this.data.id}`, { method: 'PUT', data })
      : parkRequest('/park/houses', { method: 'POST', data })
    this.setData({ submitting: true })
    req.then(() => {
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    }).finally(() => this.setData({ submitting: false }))
  },
})
