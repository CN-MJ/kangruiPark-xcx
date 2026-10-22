const { request } = require('../../utils/request')

function formatHeight(value) {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  return `${String(n).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')}m`
}

function formatFloorLabel(floor, fallback) {
  if (fallback) return fallback
  if (floor == null || floor === '') return '—'
  const n = Number(floor)
  if (Number.isNaN(n)) return '—'
  if (n === -1) return '负一层'
  if (n < 0) return `负${Math.abs(n)}层`
  return `${n}层`
}

Page({
  data: { detail: null },

  onLoad(options) {
    if (options.id) this.loadDetail(options.id)
  },

  loadDetail(id) {
    request(`/houses/${id}`)
      .then((res) => {
        const d = res.data || {}
        this.setData({
          detail: {
            ...d,
            floorText: formatFloorLabel(d.floor, d.floor_label),
            heightText: formatHeight(d.floor_height) || '—',
            buildingText: d.building_label || (d.building_no ? `${d.building_no}栋` : '—'),
            roomText: d.room_no || '—',
            areaText: d.building_area_text || d.area || '—',
          },
        })
      })
      .catch((err) => wx.showToast({ title: err.message || '加载失败', icon: 'none' }))
  },
})
