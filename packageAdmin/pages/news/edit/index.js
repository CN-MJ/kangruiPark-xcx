const { parkRequest } = require('../../../../utils/request')
const { uploadImage, isRemoteImageUrl } = require('../../../../utils/upload')
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
    saveProgress: 0,
    saveProgressText: '',
    saveProgressDetail: '',
  },

  onLoad(options) {
    if (!parkAuth.canAccessParkAdmin()) {
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

  setSaveProgress(text, detail, progress) {
    this.setData({
      saveProgressText: text || '',
      saveProgressDetail: detail || '',
      saveProgress: Math.max(0, Math.min(100, Math.round(progress || 0))),
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
    if (this.data.loading) return
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
    if (this.data.loading) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFiles[0].tempFilePath
        this.setData({ coverLocal: filePath, coverImage: '' })
      },
    })
  },

  onRemoveCover() {
    if (this.data.loading) return
    this.setData({ coverImage: '', coverLocal: '' })
  },

  onTopChange(e) {
    this.setData({ isTop: e.detail.value })
  },

  onPreview() {
    if (this.data.loading) return
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

  preventTouchMove() {},

  onSubmit() {
    if (this.data.loading) return

    const { id, type, title, content, coverLocal, isTop } = this.data
    if (!title.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' })
      return
    }
    if (!content.trim()) {
      wx.showToast({ title: '请填写正文', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    this.setSaveProgress('准备保存', '校验表单内容…', 5)

    const needUpload = type !== 'notice' && coverLocal && !isRemoteImageUrl(coverLocal)
    const uploadStep = needUpload
      ? Promise.resolve()
          .then(() => {
            this.setSaveProgress('正在上传封面', '较大图片会先压缩…', 20)
            return uploadImage(coverLocal, { purpose: 'news' })
          })
          .then((url) => {
            this.setData({ coverImage: url, coverLocal: url })
            this.setSaveProgress('封面上传完成', '准备提交表单…', 60)
            return url
          })
      : Promise.resolve(type === 'notice' ? null : (coverLocal || this.data.coverImage || null))

    uploadStep
      .then((coverUrl) => {
        this.setSaveProgress('正在保存内容', '提交表单数据…', 75)
        const payload = {
          title: title.trim(),
          type,
          content: content.trim(),
          cover_image: type === 'notice' ? null : (coverUrl || null),
          is_top: isTop,
        }
        return id
          ? parkRequest(`/park/news/${id}`, { method: 'PUT', data: payload })
          : parkRequest('/park/news', { method: 'POST', data: payload })
      })
      .then((res) => {
        this.setSaveProgress('保存完成', '即将返回…', 100)
        wx.showToast({ title: res.msg || '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 800)
      })
      .catch((err) => {
        this.setData({
          loading: false,
          saveProgress: 0,
          saveProgressText: '',
          saveProgressDetail: '',
        })
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      })
  },
})
