const { parkRequest } = require('../../../../utils/request')
const { uploadImage } = require('../../../../utils/upload')
const parkAuth = require('../../../../utils/parkAuth')

const TYPE_OPTIONS = [
  { value: 'news', label: '园区动态' },
  { value: 'notice', label: '首页公告' },
]

Page({
  data: {
    id: null,
    type: 'news',
    typeOptions: TYPE_OPTIONS,
    typeIndex: 0,
    isNotice: false,
    title: '',
    content: '',
    contentLen: 0,
    coverImage: '',
    coverLocal: '',
    isTop: false,
    loading: false,
    uploading: false,
  },

  onLoad(options) {
    if (!parkAuth.isParkLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }

    if (options.id) {
      this.setData({ id: options.id })
      wx.setNavigationBarTitle({ title: '编辑内容' })
      this.loadDetail(options.id)
    } else if (options.type === 'notice') {
      this.setType('notice')
      wx.setNavigationBarTitle({ title: '发布公告' })
    } else {
      wx.setNavigationBarTitle({ title: '发布新闻' })
    }
  },

  setType(type) {
    const typeIndex = TYPE_OPTIONS.findIndex((item) => item.value === type)
    this.setData({
      type,
      typeIndex: typeIndex >= 0 ? typeIndex : 0,
      isNotice: type === 'notice',
    })
  },

  loadDetail(id) {
    parkRequest(`/park/news/${id}`)
      .then((res) => {
        const type = res.data.type || 'news'
        this.setType(type)
        this.setData({
          title: res.data.title,
          content: res.data.content,
          contentLen: (res.data.content || '').length,
          coverImage: res.data.cover_image || '',
          coverLocal: res.data.cover_image || '',
          isTop: !!res.data.is_top,
        })
        wx.setNavigationBarTitle({ title: type === 'notice' ? '编辑公告' : '编辑新闻' })
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onTypeChange(e) {
    const index = Number(e.detail.value)
    const type = TYPE_OPTIONS[index].value
    this.setType(type)
    if (type === 'notice') {
      this.setData({ coverImage: '', coverLocal: '' })
    }
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onContentInput(e) {
    const content = e.detail.value
    this.setData({ content, contentLen: content.length })
  },

  onChooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFiles[0].tempFilePath
        this.setData({ coverLocal: filePath, uploading: true })
        uploadImage(filePath)
          .then((url) => {
            this.setData({ coverImage: url, coverLocal: url, uploading: false })
            wx.showToast({ title: '封面上传成功', icon: 'success' })
          })
          .catch((err) => {
            this.setData({ uploading: false })
            wx.showToast({ title: err.message || '上传失败', icon: 'none' })
          })
      },
    })
  },

  onRemoveCover() {
    this.setData({ coverImage: '', coverLocal: '' })
  },

  onTopChange(e) {
    this.setData({ isTop: e.detail.value })
  },

  onPreview() {
    const { title, content } = this.data
    if (!title.trim()) {
      wx.showToast({ title: '请先填写标题', icon: 'none' })
      return
    }
    wx.showModal({
      title: title.trim(),
      content: content.trim() || '（暂无正文）',
      showCancel: false,
      confirmText: '知道了',
    })
  },

  onSubmit() {
    if (this.data.loading) return

    const { id, type, title, content, coverImage, isTop, uploading } = this.data
    if (uploading) {
      wx.showToast({ title: '封面上传中，请稍候', icon: 'none' })
      return
    }
    if (!title.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' })
      return
    }
    if (!content.trim()) {
      wx.showToast({ title: '请填写正文', icon: 'none' })
      return
    }

    const payload = {
      title: title.trim(),
      type,
      content: content.trim(),
      cover_image: type === 'notice' ? null : (coverImage || null),
      is_top: isTop,
    }

    this.setData({ loading: true })
    const req = id
      ? parkRequest(`/park/news/${id}`, { method: 'PUT', data: payload })
      : parkRequest('/park/news', { method: 'POST', data: payload })

    req
      .then((res) => {
        wx.showToast({ title: res.msg || '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 800)
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },
})
