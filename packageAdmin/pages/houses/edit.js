const { parkRequest } = require('../../../utils/request')
const { HOUSE_LEASE_OPTIONS } = require('../../utils/cms')

const LEASE_OPTIONS = HOUSE_LEASE_OPTIONS.map((item) => ({
  ...item,
  tone: ({
    available: 'blue',
    rented_sold: 'red',
    rented_unsold: 'yellow',
    sold_unrented: 'gray',
  })[item.value] || 'blue',
}))

function formatFloorLabel(floor) {
  if (floor === '' || floor == null) return ''
  const n = Number(floor)
  if (Number.isNaN(n)) return ''
  if (n === -1) return '负一层'
  if (n < 0) return `负${Math.abs(n)}层`
  return `${n}层`
}

function buildPreview(data) {
  const building = String(data.building_no || '').trim().replace(/栋$/u, '')
  const room = String(data.room_no || '').trim()
  const title = building && room
    ? `${building}栋 ${room}`
    : (building ? `${building}栋` : (room ? `房号 ${room}` : '新建房源'))
  const parts = []
  const floorText = formatFloorLabel(data.floor)
  if (floorText) parts.push(floorText)
  if (String(data.floor_height || '').trim()) {
    parts.push(`层高 ${String(data.floor_height).trim()}m`)
  }
  if (String(data.building_area || '').trim()) {
    parts.push(`${String(data.building_area).trim()}㎡`)
  }
  return {
    previewTitle: title,
    previewSub: parts.length ? parts.join(' · ') : '填写下方信息后自动预览',
  }
}

Page({
  data: {
    id: '',
    building_no: '',
    floor: '',
    floor_height: '',
    room_no: '',
    building_area: '',
    leaseOptions: LEASE_OPTIONS,
    leaseIndex: 0,
    lease_sale_status: 'available',
    leaseTone: 'blue',
    status: 1,
    sort_order: 0,
    intents_count: 0,
    title: '',
    previewTitle: '新建房源',
    previewSub: '填写下方信息后自动预览',
    submitting: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      parkRequest(`/park/houses/${options.id}`).then((res) => {
        const d = res.data || {}
        const leaseIndex = Math.max(
          0,
          LEASE_OPTIONS.findIndex((item) => item.value === d.lease_sale_status),
        )
        const next = {
          building_no: d.building_no || '',
          floor: d.floor != null ? String(d.floor) : '',
          floor_height: d.floor_height != null ? String(d.floor_height) : '',
          room_no: d.room_no || '',
          building_area: d.building_area != null ? String(d.building_area) : '',
          leaseIndex: leaseIndex < 0 ? 0 : leaseIndex,
          lease_sale_status: d.lease_sale_status || 'available',
          leaseTone: (LEASE_OPTIONS[leaseIndex] || LEASE_OPTIONS[0]).tone,
          status: d.status === 0 ? 0 : 1,
          sort_order: d.sort_order || 0,
          intents_count: d.intents_count || 0,
          title: d.title || '',
        }
        this.setData({
          ...next,
          ...buildPreview(next),
        })
      })
    }
  },

  refreshPreview( partial = {}) {
    const merged = { ...this.data, ...partial }
    this.setData(buildPreview(merged))
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    this.setData({ [key]: value })
    if (['building_no', 'room_no', 'floor', 'floor_height', 'building_area'].indexOf(key) !== -1) {
      this.refreshPreview({ [key]: value })
    }
  },

  onLeaseTap(e) {
    const value = e.currentTarget.dataset.value
    const leaseIndex = Number(e.currentTarget.dataset.index)
    const item = LEASE_OPTIONS[leaseIndex] || LEASE_OPTIONS[0]
    this.setData({
      leaseIndex,
      lease_sale_status: value || item.value,
      leaseTone: item.tone,
    })
  },

  onMarketSwitch(e) {
    this.setData({ status: e.detail.value ? 1 : 0 })
  },

  onSubmit() {
    if (this.data.submitting) return
    const buildingNo = String(this.data.building_no || '').trim().replace(/栋$/u, '')
    const roomNo = String(this.data.room_no || '').trim()
    const floorRaw = String(this.data.floor || '').trim()
    const floor = Number(floorRaw)
    const buildingArea = Number(this.data.building_area)
    const floorHeightRaw = String(this.data.floor_height || '').trim()
    const floorHeight = floorHeightRaw === '' ? null : Number(floorHeightRaw)

    if (!buildingNo || !roomNo || floorRaw === '' || Number.isNaN(floor) || !buildingArea) {
      wx.showToast({ title: '请填写栋号、层数、房号、建筑面积', icon: 'none' })
      return
    }
    if (floorHeightRaw !== '' && Number.isNaN(floorHeight)) {
      wx.showToast({ title: '层高格式不正确', icon: 'none' })
      return
    }

    const data = {
      building_no: buildingNo,
      floor,
      floor_height: floorHeight,
      room_no: roomNo,
      building_area: buildingArea,
      lease_sale_status: this.data.lease_sale_status || 'available',
      status: this.data.status,
      sort_order: Number(this.data.sort_order || 0),
    }

    const req = this.data.id
      ? parkRequest(`/park/houses/${this.data.id}`, { method: 'PUT', data })
      : parkRequest('/park/houses', { method: 'POST', data })

    this.setData({ submitting: true })
    req
      .then(() => {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 500)
      })
      .catch((err) => wx.showToast({ title: err.message || '保存失败', icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },

  onViewIntents() {
    const { id, title, building_no, room_no } = this.data
    if (!id) return
    const label = title || `${building_no}栋 ${room_no}`
    wx.navigateTo({
      url: `/packageAdmin/pages/investments/index?house_id=${id}&house_title=${encodeURIComponent(label)}`,
    })
  },
})
