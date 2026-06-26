const { parkRequest } = require('../../../utils/request')
const { uploadImage } = require('../../../utils/upload')

const LEVELS = ['国家级', '市级', '区级', '园区级']

Page({
  data: { id: '', title: '', levelIndex: 0, content: '', cover_image: '', sort_order: 0, is_show: true, levels: LEVELS, submitting: false },
  onLoad(options) {
    if (!options.id) return
    this.setData({ id: options.id })
    parkRequest(`/park/policies/${options.id}`).then((res) => {
      const d = res.data
      this.setData({
        ...d,
        levelIndex: Math.max(0, LEVELS.indexOf(d.level)),
      })
    })
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }) },
  onLevelChange(e) { this.setData({ levelIndex: Number(e.detail.value) }) },
  onShowChange(e) { this.setData({ is_show: e.detail.value }) },
  onChooseCover() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => uploadImage(res.tempFiles[0].tempFilePath).then((url) => this.setData({ cover_image: url })) })
  },
  onSubmit() {
    if (this.data.submitting) return
    const data = {
      title: this.data.title.trim(),
      level: LEVELS[this.data.levelIndex],
      content: this.data.content.trim(),
      cover_image: this.data.cover_image || null,
      sort_order: Number(this.data.sort_order || 0),
      is_show: this.data.is_show,
    }
    if (!data.title || !data.content) {
      wx.showToast({ title: '请填写标题和内容', icon: 'none' })
      return
    }
    const req = this.data.id ? parkRequest(`/park/policies/${this.data.id}`, { method: 'PUT', data }) : parkRequest('/park/policies', { method: 'POST', data })
    this.setData({ submitting: true })
    req.then(() => { wx.showToast({ title: '保存成功', icon: 'success' }); setTimeout(() => wx.navigateBack(), 500) })
      .finally(() => this.setData({ submitting: false }))
  },
})
