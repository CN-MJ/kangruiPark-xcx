const { API_BASE_URL } = require('./config')
const { getToken } = require('./parkAuth')
const { parseNetworkError } = require('./request')

const UPLOAD_TIMEOUT = 30000

function uploadImage(filePath) {
  const token = getToken()
  if (!token) {
    return Promise.reject(new Error('请先登录园区工作台'))
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_BASE_URL}/park/upload`,
      filePath,
      name: 'file',
      timeout: UPLOAD_TIMEOUT,
      header: {
        Authorization: `Bearer ${token}`,
      },
      success(res) {
        try {
          const data = JSON.parse(res.data)
          if (res.statusCode >= 200 && res.statusCode < 300 && data.code === 200) {
            resolve(data.data.url)
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
  })
}

module.exports = {
  uploadImage,
}
