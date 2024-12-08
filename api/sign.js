import request from '../utils/request.js'
import { BASE_URL } from '../utils/request.js'

// 登录
export function userLogin(data) {
  return request({
    url: '/api/login',
    method: 'POST',
    data
  })
}

// 退出登录
export function logout() {
  const token = uni.getStorageSync('token')
  return request({
    url: '/api/logout',
    method: 'POST',
    params: { token }
  })
}

// 获取用户信息
export function getUserInfo() {
  const token = uni.getStorageSync('token')
  return request({
    url: '/api/user/info',
    method: 'GET',
    params: { token }
  })
}

// 上传图片
export function uploadImage() {
  const token = uni.getStorageSync('token')
  return new Promise((resolve, reject) => {
    // 使用本地资源路径作为默认图片
    const filePath = '/static/default-sign.jpg'
    
    uni.uploadFile({
      url: `${BASE_URL}/api/upload`,
      filePath: filePath,
      name: 'file',
      formData: {
        token: token
      },
      success: (res) => {
        try {
          if (res.statusCode === 200) {
            const data = JSON.parse(res.data)
            resolve(data.id || '')
          } else {
            reject(new Error(res.data?.msg || '上传失败'))
          }
        } catch (error) {
          reject(new Error('解析响应失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传失败'))
      }
    })
  })
}

// 签到
export function sign(data) {
  const token = uni.getStorageSync('token')
  return request({
    url: '/api/sign',
    method: 'POST',
    data,
    params: { token },
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  })
}

// 获取打卡情况
export function getSignStatus({ autonomyId, userId, queryDate, beginQueryDate, endQueryDate }) {
  const token = uni.getStorageSync('token')
  return request({
    url: '/api/sign/status',
    method: 'GET',
    params: {
      token,
      autonomyId,
      userId,
      queryDate,
      beginQueryDate,
      endQueryDate
    }
  })
}