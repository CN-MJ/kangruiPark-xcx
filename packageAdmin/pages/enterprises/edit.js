const { parkRequest } = require('../../../utils/request')
const {
  chooseEnterpriseImages,
  uploadLocalImages,
  ENTERPRISE_MAX_COUNT,
} = require('../../../utils/upload')
const { resolveMediaList, materializeMediaList } = require('../../../utils/media')

const AUDIENCE_OPTIONS = [
  { value: 'c', label: '面向百姓C端' },
  { value: 'b', label: '面向企业B端' },
  { value: 'bc', label: 'BC兼顾' },
]

const SOURCE_OPTIONS = [
  { value: 'community', label: '健康共同体入库' },
  { value: 'self', label: '自主入驻' },
]

Page({
  data: {
    id: '',
    name: '',
    contact_name: '',
    contact_phone: '',
    business_intro: '',
    address: '',
    latitude: '',
    longitude: '',
    map_enabled: false,
    settle_in_park: false,
    status: 1,
    images: [],
    displayImages: [],
    majors: [],
    majorIndex: 0,
    minorOptions: [],
    selectedMinorIds: [],
    audienceOptions: AUDIENCE_OPTIONS,
    audienceIndex: 2,
    sourceOptions: SOURCE_OPTIONS,
    sourceIndex: 0,
    submitting: false,
    saveProgress: 0,
    saveProgressText: '',
    saveProgressDetail: '',
    maxImages: ENTERPRISE_MAX_COUNT,
  },

  onLoad(options) {
    parkRequest('/park/enterprise-categories', { data: { tree: 1 } })
      .then((res) => {
        const majors = (res.data.list || []).filter((m) => m.status === 1)
        this.setData({ majors })
        this.refreshMinors(0)

        if (options.id) {
          this.setData({ id: options.id })
          return parkRequest(`/park/enterprises/${options.id}`).then((entRes) => {
            const d = entRes.data
            const majorIndex = Math.max(0, majors.findIndex((m) => m.id === d.primary_category_id))
            const audienceIndex = Math.max(0, AUDIENCE_OPTIONS.findIndex((a) => a.value === d.service_audience))
            const sourceIndex = Math.max(0, SOURCE_OPTIONS.findIndex((s) => s.value === d.source))
            const remoteImages = resolveMediaList(d.images || [])
            this.setData({
              name: d.name || '',
              contact_name: d.contact_name || '',
              contact_phone: d.contact_phone || '',
              business_intro: d.business_intro || '',
              address: d.address || '',
              latitude: d.latitude != null ? String(d.latitude) : '',
              longitude: d.longitude != null ? String(d.longitude) : '',
              map_enabled: !!d.map_enabled,
              settle_in_park: !!d.settle_in_park,
              status: d.status,
              images: remoteImages,
              displayImages: remoteImages,
              majorIndex,
              selectedMinorIds: d.category_ids || [],
              audienceIndex,
              sourceIndex,
            })
            this.refreshMinors(majorIndex, d.category_ids || [])
            return materializeMediaList(remoteImages).then((localImages) => {
              if (localImages && localImages.length) {
                this.setData({ displayImages: localImages })
              }
            })
          })
        }
        return null
      })
      .catch((err) => wx.showToast({ title: err.message || '加载失败', icon: 'none' }))
  },

  refreshMinors(majorIndex, keepIds) {
    const major = this.data.majors[majorIndex]
    const minors = ((major && major.children) || []).filter((c) => c.status === 1)
    const selected = keepIds
      ? keepIds.filter((id) => minors.some((m) => m.id === id))
      : []
    this.setData({
      minorOptions: minors.map((m) => ({
        ...m,
        checked: selected.indexOf(m.id) !== -1,
      })),
      selectedMinorIds: selected,
    })
  },

  setSaveProgress(text, detail, progress) {
    this.setData({
      saveProgressText: text || '',
      saveProgressDetail: detail || '',
      saveProgress: Math.max(0, Math.min(100, Math.round(progress || 0))),
    })
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value })
  },

  onMajorChange(e) {
    const majorIndex = Number(e.detail.value)
    this.setData({ majorIndex })
    this.refreshMinors(majorIndex, [])
  },

  onToggleMinor(e) {
    const id = Number(e.currentTarget.dataset.id)
    let selected = this.data.selectedMinorIds.slice()
    const idx = selected.indexOf(id)
    if (idx === -1) selected.push(id)
    else selected.splice(idx, 1)
    this.setData({
      selectedMinorIds: selected,
      minorOptions: this.data.minorOptions.map((m) => ({
        ...m,
        checked: selected.indexOf(m.id) !== -1,
      })),
    })
  },

  onAudienceChange(e) {
    this.setData({ audienceIndex: Number(e.detail.value) })
  },

  onSourceChange(e) {
    this.setData({ sourceIndex: Number(e.detail.value) })
  },

  onSwitch(e) {
    this.setData({ [e.currentTarget.dataset.key]: !!e.detail.value })
  },

  onStatusChange(e) {
    this.setData({ status: Number(e.detail.value) })
  },

  onChooseLocation() {
    if (this.data.submitting) return
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          address: res.address || res.name || this.data.address,
          latitude: String(res.latitude),
          longitude: String(res.longitude),
          map_enabled: true,
        })
      },
    })
  },

  onAddImages() {
    if (this.data.submitting) return
    chooseEnterpriseImages(this.data.images.length)
      .then((paths) => {
        if (!paths.length) return
        const images = this.data.images.concat(paths).slice(0, ENTERPRISE_MAX_COUNT)
        const displayImages = this.data.displayImages.concat(paths).slice(0, ENTERPRISE_MAX_COUNT)
        this.setData({ images, displayImages })
      })
      .catch((err) => wx.showToast({ title: err.message || '选择失败', icon: 'none' }))
  },

  onRemoveImage(e) {
    if (this.data.submitting) return
    const index = Number(e.currentTarget.dataset.index)
    const images = this.data.images.slice()
    const displayImages = this.data.displayImages.slice()
    images.splice(index, 1)
    displayImages.splice(index, 1)
    this.setData({ images, displayImages })
  },

  preventTouchMove() {},

  onSubmit() {
    if (this.data.submitting) return
    const { majors, majorIndex, selectedMinorIds, audienceOptions, audienceIndex, sourceOptions, sourceIndex } = this.data
    if (!majors.length) {
      wx.showToast({ title: '请先配置企业大类', icon: 'none' })
      return
    }
    if (!selectedMinorIds.length) {
      wx.showToast({ title: '请至少勾选一个小类', icon: 'none' })
      return
    }

    const name = this.data.name.trim()
    const businessIntro = this.data.business_intro.trim()
    if (!name || !businessIntro) {
      wx.showToast({ title: '请填写名称与主营业务简介', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    this.setSaveProgress('准备保存', '校验表单内容…', 2)

    const pendingCount = this.data.images.filter((src) => src && !/^https?:\/\//i.test(src)).length
    const totalSteps = pendingCount + 1

    uploadLocalImages(this.data.images, {
      purpose: 'enterprise',
      onProgress: ({ current, total, phase }) => {
        if (phase === 'start') {
          this.setSaveProgress(
            '正在上传图片',
            `正在处理第 ${current}/${total} 张（较大图片会先压缩）`,
            Math.round(((current - 1) / totalSteps) * 100) || 5,
          )
          return
        }
        this.setSaveProgress(
          '正在上传图片',
          `已完成 ${current}/${total} 张`,
          Math.round((current / totalSteps) * 100),
        )
      },
    })
      .then((remoteImages) => {
        this.setData({ images: remoteImages, displayImages: remoteImages })
        materializeMediaList(remoteImages).then((localImages) => {
          if (localImages && localImages.length) {
            this.setData({ displayImages: localImages })
          }
        })
        this.setSaveProgress(
          '正在保存企业信息',
          '提交表单数据…',
          Math.round(pendingCount / totalSteps * 100),
        )

        const data = {
          name,
          contact_name: this.data.contact_name.trim(),
          contact_phone: this.data.contact_phone.trim(),
          primary_category_id: majors[majorIndex].id,
          category_ids: selectedMinorIds,
          business_intro: businessIntro,
          address: this.data.address.trim(),
          map_enabled: this.data.map_enabled,
          latitude: this.data.latitude ? Number(this.data.latitude) : null,
          longitude: this.data.longitude ? Number(this.data.longitude) : null,
          service_audience: audienceOptions[audienceIndex].value,
          source: sourceOptions[sourceIndex].value,
          settle_in_park: this.data.settle_in_park,
          images: remoteImages,
          status: this.data.status,
        }

        return this.data.id
          ? parkRequest(`/park/enterprises/${this.data.id}`, { method: 'PUT', data })
          : parkRequest('/park/enterprises', { method: 'POST', data })
      })
      .then(() => {
        this.setSaveProgress('保存完成', '即将返回列表…', 100)
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 500)
      })
      .catch((err) => {
        this.setData({
          submitting: false,
          saveProgress: 0,
          saveProgressText: '',
          saveProgressDetail: '',
        })
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      })
  },
})
