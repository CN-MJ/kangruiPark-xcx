const { API_BASE_URL } = require('./config')
const { getToken } = require('./parkAuth')
const { parseNetworkError } = require('./request')

const UPLOAD_TIMEOUT = 30000
const ENTERPRISE_MAX_BYTES = 2 * 1024 * 1024
const ENTERPRISE_SOFT_BYTES = 1 * 1024 * 1024 // 超过约 1MB 就开始降质
const ENTERPRISE_MAX_COUNT = 5
const NEWS_MAX_BYTES = 4 * 1024 * 1024
const NEWS_SOFT_BYTES = 1.5 * 1024 * 1024

function getFileSize(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileInfo({
      filePath,
      success: (res) => resolve(res.size || 0),
      fail: reject,
    })
  })
}

/**
 * 超过 softBytes 开始逐步降低画质；目标压到 maxBytes 以内
 */
function compressToLimit(filePath, maxBytes, softBytes) {
  const soft = softBytes == null ? Math.floor(maxBytes * 0.5) : softBytes

  return getFileSize(filePath).then((size) => {
    if (size <= soft) {
      return filePath
    }

    // 越大起点质量越低
    const qualities = size > maxBytes
      ? [70, 55, 40, 28, 18]
      : [82, 70, 58, 45, 32]

    const tryNext = (index) => {
      if (index >= qualities.length) {
        return getFileSize(filePath).then((s) => {
          if (s <= maxBytes) return filePath
          return Promise.reject(new Error('图片过大，请选择更小的图片或裁剪后再传'))
        })
      }
      return new Promise((resolve, reject) => {
        wx.compressImage({
          src: filePath,
          quality: qualities[index],
          success: (res) => {
            const out = res.tempFilePath || filePath
            getFileSize(out)
              .then((s) => {
                if (s <= maxBytes) resolve(out)
                else if (s < size * 0.95) {
                  // 有缩小但仍超限，以当前结果继续降质
                  compressToLimit(out, maxBytes, 0).then(resolve).catch(() => {
                    tryNext(index + 1).then(resolve).catch(reject)
                  })
                } else {
                  tryNext(index + 1).then(resolve).catch(reject)
                }
              })
              .catch(reject)
          },
          fail: () => tryNext(index + 1).then(resolve).catch(reject),
        })
      })
    }

    return tryNext(0)
  })
}

function uploadUserAvatar(filePath) {
  const { getToken } = require('./userAuth')
  const token = getToken()
  if (!token) {
    return Promise.reject(new Error('请先登录'))
  }

  return compressToLimit(filePath, ENTERPRISE_MAX_BYTES, ENTERPRISE_SOFT_BYTES).then((path) => new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_BASE_URL}/users/avatar`,
      filePath: path,
      name: 'file',
      timeout: UPLOAD_TIMEOUT,
      header: {
        Authorization: `Bearer ${token}`,
      },
      success(res) {
        try {
          const data = JSON.parse(res.data)
          if (res.statusCode >= 200 && res.statusCode < 300 && data.code === 200) {
            const raw = (data.data && data.data.path) || ''
            resolve(raw)
            return
          }
          reject(new Error((data && data.msg) || '上传失败'))
        } catch (e) {
          reject(new Error('上传失败'))
        }
      },
      fail(err) {
        reject(parseNetworkError(err))
      },
    })
  }))
}

function downloadUserAvatar() {
  const { getToken } = require('./userAuth')
  const token = getToken()
  if (!token) {
    return Promise.reject(new Error('请先登录'))
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}/users/avatar`,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: UPLOAD_TIMEOUT,
      header: {
        Authorization: `Bearer ${token}`,
      },
      success(res) {
        if (res.statusCode === 404) {
          resolve('')
          return
        }
        if (res.statusCode < 200 || res.statusCode >= 300 || !res.data) {
          reject(new Error('头像加载失败'))
          return
        }
        const header = res.header || {}
        const type = String(header['Content-Type'] || header['content-type'] || '')
        let ext = '.jpg'
        if (type.indexOf('png') !== -1) ext = '.png'
        else if (type.indexOf('webp') !== -1) ext = '.webp'
        const filePath = `${wx.env.USER_DATA_PATH}/user_avatar_${Date.now()}${ext}`
        wx.getFileSystemManager().writeFile({
          filePath,
          data: res.data,
          success: () => resolve(filePath),
          fail: () => reject(new Error('头像保存失败')),
        })
      },
      fail(err) {
        reject(parseNetworkError(err))
      },
    })
  })
}

function uploadImage(filePath, options = {}) {
  const token = getToken()
  if (!token) {
    return Promise.reject(new Error('请先登录园区工作台'))
  }

  const purpose = options.purpose || 'news'
  const formData = { purpose }
  const isEnterprise = purpose === 'enterprise'
  const maxBytes = isEnterprise ? ENTERPRISE_MAX_BYTES : NEWS_MAX_BYTES
  const softBytes = isEnterprise ? ENTERPRISE_SOFT_BYTES : NEWS_SOFT_BYTES

  return compressToLimit(filePath, maxBytes, softBytes).then((path) => new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_BASE_URL}/park/upload`,
      filePath: path,
      name: 'file',
      formData,
      timeout: UPLOAD_TIMEOUT,
      header: {
        Authorization: `Bearer ${token}`,
      },
      success(res) {
        try {
          const data = JSON.parse(res.data)
          if (res.statusCode >= 200 && res.statusCode < 300 && data.code === 200) {
            // 优先用可访问 url；同时兼容只返回 path 的情况
            const { resolveMediaUrl } = require('./media')
            const raw = (data.data && (data.data.url || data.data.path)) || ''
            resolve(resolveMediaUrl(raw))
            return
          }
          reject(new Error((data && data.msg) || '上传失败'))
        } catch (e) {
          reject(new Error('上传失败'))
        }
      },
      fail(err) {
        reject(parseNetworkError(err))
      },
    })
  }))
}

function isRemoteImageUrl(src) {
  return typeof src === 'string' && /^https?:\/\//i.test(src)
}

/**
 * 仅选择企业图片（本地预览），保存时再上传；最多 maxCount 张
 */
function chooseEnterpriseImages(currentCount = 0, maxCount = ENTERPRISE_MAX_COUNT) {
  const remain = Math.max(0, maxCount - currentCount)
  if (remain <= 0) {
    return Promise.reject(new Error(`最多选择 ${maxCount} 张图片`))
  }

  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const paths = (res.tempFiles || [])
          .map((file) => file.tempFilePath)
          .filter(Boolean)
        resolve(paths)
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf('cancel') !== -1) {
          resolve([])
          return
        }
        reject(err || new Error('选择图片失败'))
      },
    })
  })
}

/**
 * 依次上传本地图片，已是 http(s) 的跳过；onProgress({ index, total, path })
 */
function uploadLocalImages(paths, options = {}) {
  const list = Array.isArray(paths) ? paths.slice() : []
  const purpose = options.purpose || 'enterprise'
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null
  const pending = list
    .map((src, index) => ({ src, index }))
    .filter((item) => item.src && !isRemoteImageUrl(item.src))

  if (!pending.length) {
    return Promise.resolve(list)
  }

  const run = async () => {
    for (let i = 0; i < pending.length; i += 1) {
      const item = pending[i]
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: pending.length,
          path: item.src,
          phase: 'start',
        })
      }
      // eslint-disable-next-line no-await-in-loop
      const url = await uploadImage(item.src, { purpose })
      list[item.index] = url
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: pending.length,
          path: url,
          phase: 'done',
        })
      }
    }
    return list
  }

  return run()
}

module.exports = {
  uploadImage,
  uploadUserAvatar,
  downloadUserAvatar,
  chooseEnterpriseImages,
  uploadLocalImages,
  isRemoteImageUrl,
  compressToLimit,
  ENTERPRISE_MAX_BYTES,
  ENTERPRISE_MAX_COUNT,
}
