const { getIconSrc } = require('../../utils/icons')

Component({
  properties: {
    name: {
      type: String,
      value: '',
    },
    size: {
      type: Number,
      value: 48,
    },
    color: {
      type: String,
      value: '#0f766e',
    },
  },

  data: {
    src: '',
  },

  observers: {
    'name, color'() {
      this.updateSrc()
    },
  },

  lifetimes: {
    attached() {
      this.updateSrc()
    },
  },

  methods: {
    updateSrc() {
      const { name, color } = this.properties
      this.setData({
        src: getIconSrc(name, color),
      })
    },
  },
})
