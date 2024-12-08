<template>
  <view class="container">
    <!-- 用户信息卡片 -->
    <view class="user-card" v-if="userInfo">
      <view class="avatar">
        <text class="avatar-text">{{ userInfo.nickName ? userInfo.nickName.substr(0, 1) : '未' }}</text>
      </view>
      <view class="user-info">
        <text class="nickname">{{ userInfo.nickName || '未登录' }}</text>
        <text class="status">{{ todaySignStatus }}</text>
      </view>
      <!-- 退出登录按钮 -->
      <button class="logout-btn" @click="handleLogout" :disabled="loading">
        退出登录
      </button>
    </view>

    <!-- 实习地址卡片 -->
    <view class="address-card" v-if="isLogin">
      <view class="card-title">
        <text>实习地址</text>
        <button class="edit-btn" @click="showAddressEdit" v-if="!isEditingAddress">
          修改
        </button>
      </view>
      <view class="address-content">
        <text class="address-text">{{ userInfo.practicePlace || '未设置' }}</text>
      </view>
    </view>

    <!-- 修改地址弹窗 -->
    <view class="popup-mask" v-if="showAddressPopup" @click="cancelAddressEdit">
      <view class="popup-wrapper" @click.stop>
        <view class="popup-content">
          <view class="popup-title">修改实习地址</view>
          <input class="popup-input" v-model="editAddress" placeholder="请输入实习地址" :disabled="addressLoading" />
          <view class="popup-buttons">
            <button class="popup-btn cancel" @click="cancelAddressEdit" :disabled="addressLoading">
              取消
            </button>
            <button class="popup-btn confirm" @click="saveAddress" :disabled="addressLoading">
              确定
            </button>
          </view>
        </view>
      </view>
    </view>

    <!-- 今日打卡记录 -->
    <view class="records-card" v-if="isLogin">
      <view class="card-title">
        <text>今日打卡记录</text>
        <text class="date">{{ currentDate }}</text>
      </view>
      <view class="record-list">
        <view class="record-item" v-for="(record, index) in todayRecords" :key="index">
          <view class="record-type">{{ record.clockType }}</view>
          <view class="record-info">
            <text class="time">{{ record.clockTime }}</text>
            <text class="address">{{ record.clockAddress }}</text>
          </view>
        </view>
        <view class="empty" v-if="todayRecords.length === 0">
          暂无打卡记录
        </view>
      </view>
    </view>

    <!-- 自动打卡开关 -->
    <view class="auto-sign-card" v-if="isLogin">
      <view class="card-title">
        <text>自动打卡</text>
        <switch :checked="autoSignEnabled" @change="handleAutoSignChange" :disabled="loading" color="#0066ff" />
      </view>
      <view class="card-desc">
        <text>开启后将在每个工作日自动完成签到和签退</text>
        <text class="time-info">签到时间: 08:30 - 09:00</text>
        <text class="time-info">签退时间: 17:00 - 17:30</text>
      </view>
    </view>

    <!-- 签到按钮 -->
    <view class="sign-buttons" v-if="isLogin">
      <button class="sign-btn" :class="{ 'sign-out': todayRecords.length === 1 }" @click="handleSign" :disabled="loading || todayRecords.length >= 2">
        <template v-if="loading">
          {{ '签到中...' }}
        </template>
        <template v-else>
          <template v-if="todayRecords.length === 0"> 签到 </template>
          <template v-else-if="todayRecords.length === 1"> 签退 </template>
          <template v-else> 今日无需再签到 </template>
        </template>
      </button>
    </view>

    <!-- 登录按钮 -->
    <button class="login-btn" v-if="!isLogin" @click="toLogin">立即登录</button>
  </view>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import {
  getSignStatus,
  getUserInfo,
  uploadImage,
  sign,
  logout
} from '@/api/sign'
import { formatDate } from '@/utils/date'

export default {
  data() {
    return {
      isLogin: false,
      loading: false,
      userInfo: null,
      todayRecords: [],
      isEditingAddress: false,
      editAddress: '',
      addressLoading: false,
      autoSignEnabled: false,
      showAddressPopup: false
    }
  },
  computed: {
    currentDate() {
      return formatDate(new Date())
    },
    todaySignStatus() {
      if (!this.isLogin) return '未登录'
      if (this.todayRecords.length === 0) return '今日未打卡'
      if (this.todayRecords.length === 1) return '已签到1次'
      return '今日已完成打卡'
    }
  },
  async mounted() {
    // 检查登录状态
    const token = uni.getStorageSync('token')
    if (token) {
      this.isLogin = true
      await this.fetchUserInfo()
    }
    if (this.isLogin) {
      // 获取本地存储的自动打卡状态
      this.autoSignEnabled = uni.getStorageSync('autoSignEnabled') || false
    }
  },
  methods: {
    // 获取用户信息
    async fetchUserInfo() {
      try {
        // 先尝试从本地获取
        const localUserInfo = uni.getStorageSync('userInfo')
        if (localUserInfo) {
          this.userInfo = localUserInfo
          await this.getRecords()
          return
        }

        // 如果本地没有，则从服务器获取
        const res = await getUserInfo()
        if (res.code === 200) {
          const autonomyPlan = res.data.autonomyPlan
          const newUserInfo = {
            autonomyId: autonomyPlan.id,
            userId: autonomyPlan.userId,
            nickName: autonomyPlan.nickName,
            practicePlace: autonomyPlan.practicePlace
          }
          this.userInfo = newUserInfo
          // 保存到本地存储
          uni.setStorageSync('userInfo', newUserInfo)
          await this.getRecords()
        }
      } catch (e) {
        uni.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        })
      }
    },

    // 显示地址编辑
    showAddressEdit() {
      this.editAddress = this.userInfo.practicePlace || ''
      this.showAddressPopup = true
    },

    // 取消地址编辑
    cancelAddressEdit() {
      this.showAddressPopup = false
    },

    // 保存地址
    async saveAddress() {
      if (!this.editAddress.trim()) {
        uni.showToast({
          title: '请输入实习地址',
          icon: 'none'
        })
        return
      }

      this.addressLoading = true
      try {
        // 更新本地存储的用户信息
        const updatedUserInfo = {
          ...this.userInfo,
          practicePlace: this.editAddress.trim()
        }
        uni.setStorageSync('userInfo', updatedUserInfo)
        this.userInfo = updatedUserInfo

        uni.showToast({
          title: '地址更新成功',
          icon: 'success'
        })
        this.showAddressPopup = false
      } catch (e) {
        uni.showToast({
          title: e.message || '地址更新失败',
          icon: 'none'
        })
      } finally {
        this.addressLoading = false
      }
    },

    // 获取打卡记录
    async getRecords() {
      try {
        const today = new Date().toISOString().split('T')[0]
        const res = await getSignStatus({
          autonomyId: this.userInfo.autonomyId,
          userId: this.userInfo.userId,
          queryDate: today
        })
        if (res.code === 200) {
          this.todayRecords = res.rows || []
        } else {
          throw new Error(res.msg || '获取记录失败')
        }
      } catch (e) {
        uni.showToast({
          title: e.message || '获取记录失败',
          icon: 'none'
        })
      }
    },

    // 处理签到
    async handleSign() {
      if (this.loading || this.todayRecords.length >= 2) return
      this.loading = true

      try {
        // 1. 上传固定图片
        const fileId = await uploadImage()

        // 2. 提交签到
        const signData = {
          autonomyId: this.userInfo.autonomyId,
          userId: this.userInfo.userId,
          nickName: this.userInfo.nickName,
          clockAddress: this.userInfo.practicePlace,
          fileId: fileId,
          clockTime: new Date().toISOString().replace('T', ' ').split('.')[0],
          clockType: this.todayRecords.length === 0 ? '签到' : '签退',
          clockContent: ''
        }

        const res = await sign(signData)

        if (res.code === 200) {
          uni.showToast({
            title: signData.clockType === '签到' ? '签到成功' : '签退成功',
            icon: 'success'
          })
          // 刷新记录
          await this.getRecords()
        } else {
          throw new Error(res.msg || '操作失败')
        }
      } catch (e) {
        uni.showToast({
          title: e.message || '操作失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },

    // 处理退出登录
    async handleLogout() {
      if (this.loading) return
      this.loading = true

      try {
        const res = await logout()
        if (res.code === 200) {
          // 清除本地存储
          uni.removeStorageSync('token')
          uni.removeStorageSync('userInfo')

          uni.showToast({
            title: '退出成功',
            icon: 'success'
          })

          // 直接跳转到登录页，禁止返回
          uni.reLaunch({
            url: '/pages/login/login'
          })
        }
      } catch (e) {
        uni.showToast({
          title: e.message || '退出失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },

    // 跳转登录
    toLogin() {
      uni.navigateTo({
        url: '/pages/login/login'
      })
    },

    // 下拉刷新
    async onPullDownRefresh() {
      await Promise.all([this.getRecords(), this.fetchUserInfo()])
      uni.stopPullDownRefresh()
    },

    async handleAutoSignChange(e) {
      const enabled = e.detail.value
      try {
        // 保存到本地存储
        uni.setStorageSync('autoSignEnabled', enabled)
        this.autoSignEnabled = enabled
        
        uni.showToast({
          title: enabled ? '自动打卡已开启' : '自动打卡已关闭',
          icon: 'none'
        })
      } catch (e) {
        uni.showToast({
          title: '设置失败',
          icon: 'none'
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  padding: 20rpx;

  .user-card {
    background: #1E1F22;
    border-radius: 16rpx;
    padding: 60rpx 30rpx;
    display: flex;
    align-items: center;
    margin-bottom: 30rpx;
    box-shadow: 0 2rpx 12rpx rgba(2, 1, 3, 0.1);

    .avatar {
      width: 100rpx;
      height: 100rpx;
      background: #0066ff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 20rpx;

      .avatar-text {
        color: #fff;
        font-size: 40rpx;
      }
    }

    .user-info {
      flex: 1;

      .nickname {
        font-size: 32rpx;
        font-weight: bold;
        margin-bottom: 10rpx;
        display: block;
        color: #c1c1c1;
      }

      .status {
        font-size: 26rpx;
        color: #888;
      }
    }

    .logout-btn {
      padding: 0 30rpx;
      height: 60rpx;
      line-height: 60rpx;
      font-size: 26rpx;
      color: #888;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 30rpx;
      margin: 0;

      &:disabled {
        opacity: 0.5;
      }

      &:active {
        background: rgba(255, 255, 255, 0.9);
      }
    }
  }

  .address-card {
    background: #1E1F22;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 30rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);

    .card-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;
      font-size: 30rpx;
      font-weight: bold;
      color: #c1c1c1;

      .edit-btn {
        padding: 0 30rpx;
        font-size: 26rpx;
        color: #0066ff;
        background: rgba(0, 102, 255, 0.1);
        border: none;
        border-radius: 30rpx;
        margin: 0;
      }
    }

    .address-content {
      display: flex;
      align-items: center;
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 12rpx;
      padding: 20rpx;

      .address-text {
        font-size: 28rpx;
        color: #A6A6A6;
      }
    }
  }

  .popup-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .popup-wrapper {
    animation: popup 0.2s ease-out;
  }

  @keyframes popup {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .popup-content {
    width: 600rpx;
    background: #1E1F22;
    border-radius: 16rpx;
    padding: 40rpx;

    .popup-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #c1c1c1;
      text-align: center;
      margin-bottom: 30rpx;
    }

    .popup-input {
      width: 100%;
      height: 80rpx;
      background: #2B2D30;
      border-radius: 8rpx;
      padding: 0 20rpx;
      font-size: 28rpx;
      color: #c1c1c1;
      margin-bottom: 30rpx;
      box-sizing: border-box;
    }

    .popup-buttons {
      display: flex;
      gap: 20rpx;

      .popup-btn {
        flex: 1;
        height: 80rpx;
        line-height: 80rpx;
        font-size: 28rpx;
        border-radius: 8rpx;
        margin: 0;

        &.cancel {
          background: #2B2D30;
          color: #A6A6A6;
          border-radius: 12px;
        }

        &.confirm {
          background: #0066ff;
          color: #fff;
          border-radius: 12px;
        }

        &:disabled {
          opacity: 0.5;
        }
      }
    }
  }

  .sign-buttons {
    margin-bottom: 30rpx;

    .sign-btn {
      width: 100%;
      background: linear-gradient(135deg, #0066ff, #0052cc);
      color: #fff;
      border-radius: 12rpx;
      height: 88rpx;
      line-height: 88rpx;
      font-size: 32rpx;
      transition: all 0.3s;

      &.sign-out {
        background: linear-gradient(135deg, #0066ff, #0052cc);
      }

      &:disabled {
        opacity: 0.5;
        background: #999;
      }
    }
  }

  .records-card {
    background: #1E1F22;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 30rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);

    .card-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;
      font-size: 30rpx;
      font-weight: bold;
      color: #c1c1c1;

      .date {
        font-size: 26rpx;
        color: #808080;
        font-weight: normal;
      }
    }

    .record-list {
      .record-item {
        display: flex;
        align-items: center;
        padding: 20rpx 0;
        border-bottom: 1rpx solid #2B2D30;

        &:last-child {
          border-bottom: none;
        }

        .record-type {
          background: #2B2D30;
          padding: 6rpx 20rpx;
          border-radius: 8rpx;
          font-size: 26rpx;
          margin-right: 20rpx;
          color: #A6A6A6;
        }

        .record-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;

          .time {
            font-size: 28rpx;
            margin-bottom: 4rpx;
            display: block;
            color: #c1c1c1;
          }

          .address {
            font-size: 24rpx;
            color: #808080;
          }
        }
      }

      .empty {
        text-align: center;
        color: #808080;
        font-size: 28rpx;
        padding: 40rpx 0;
      }
    }
  }

  .login-btn {
    position: fixed;
    bottom: 40rpx;
    left: 40rpx;
    right: 40rpx;
    background: #007aff;
    color: #fff;
    border-radius: 12rpx;
  }

  .auto-sign-card {
    background: #1E1F22;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 30rpx;
    box-shadow: 0 2rpx 12rpx rgba(2, 1, 3, 0.1);

    .card-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;
      
      text {
        font-size: 32rpx;
        font-weight: bold;
        color: #c1c1c1;
      }
    }

    .card-desc {
      text {
        display: block;
        font-size: 26rpx;
        color: #A6A6A6;
        margin-bottom: 10rpx;

        &.time-info {
          color: #0066ff;
          font-size: 24rpx;
        }
      }
    }
  }
}
</style>
