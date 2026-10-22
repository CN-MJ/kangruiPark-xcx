const { request } = require('../../utils/request')

const STATUS_FILTERS = [
  { value: 'available', label: '未租未售' },
  { value: 'all', label: '全部' },
  { value: 'rented_sold', label: '已租已售' },
  { value: 'rented_unsold', label: '已租未售' },
  { value: 'sold_unrented', label: '未租已售' },
]

const LEGEND = [
  { tone: 'blue', label: '未租未售' },
  { tone: 'red', label: '已租已售' },
  { tone: 'yellow', label: '已租未售' },
  { tone: 'gray', label: '未租已售' },
]

function formatHeight(value) {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  return `${String(n).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')}m`
}

function formatFloorLabel(floor, fallback) {
  if (fallback) return fallback
  if (floor == null || floor === '') return '未分层'
  const n = Number(floor)
  if (Number.isNaN(n)) return '未分层'
  if (n === -1) return '负一层'
  if (n < 0) return `负${Math.abs(n)}层`
  return `${n}层`
}

function groupByFloor(list) {
  const map = {}
  list.forEach((item) => {
    const key = item.floor != null ? String(item.floor) : '0'
    if (!map[key]) {
      map[key] = {
        floor: item.floor,
        floorLabel: formatFloorLabel(item.floor, item.floor_label),
        heightText: formatHeight(item.floor_height),
        rooms: [],
      }
    }
    if (!map[key].heightText && item.floor_height != null) {
      map[key].heightText = formatHeight(item.floor_height)
    }
    map[key].rooms.push(item)
  })
  return Object.keys(map)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => map[k])
}

Page({
  data: {
    legend: LEGEND,
    statusFilters: STATUS_FILTERS,
    statusFilter: 'available',
    buildings: [],
    activeBuilding: '',
    floors: [],
    totalCount: 0,
    loading: false,
  },

  onShow() {
    this.loadList()
  },

  onStatusTap(e) {
    const value = e.currentTarget.dataset.value
    if (!value || value === this.data.statusFilter) return
    this.setData({ statusFilter: value, activeBuilding: '' })
    this.loadList()
  },

  onBuildingTap(e) {
    const buildingNo = e.currentTarget.dataset.no
    if (buildingNo === this.data.activeBuilding) return
    this.setData({ activeBuilding: buildingNo })
    this.applyBuilding(this._rawList || [], buildingNo, this.data.buildings)
  },

  loadList() {
    this.setData({ loading: true })
    const data = {}
    if (this.data.statusFilter && this.data.statusFilter !== 'all') {
      data.lease_sale_status = this.data.statusFilter
    } else {
      data.lease_sale_status = 'all'
    }

    request('/houses', { data })
      .then((res) => {
        const payload = res.data || {}
        const list = Array.isArray(payload.list) ? payload.list : (Array.isArray(payload) ? payload : [])
        const buildings = Array.isArray(payload.buildings) ? payload.buildings : []
        let activeBuilding = this.data.activeBuilding
        if (!activeBuilding || !buildings.some((b) => b.building_no === activeBuilding)) {
          activeBuilding = buildings.length ? buildings[0].building_no : ''
        }
        this._rawList = list
        this.setData({
          buildings,
          activeBuilding,
          totalCount: list.length,
          loading: false,
        })
        this.applyBuilding(list, activeBuilding, buildings)
      })
      .catch((err) => {
        this.setData({ loading: false, floors: [], buildings: [], totalCount: 0 })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  applyBuilding(list, buildingNo) {
    const filtered = buildingNo
      ? list.filter((item) => String(item.building_no) === String(buildingNo))
      : list
    this.setData({ floors: groupByFloor(filtered) })
  },

  onRoomTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/houses/detail?id=${id}` })
  },
})
