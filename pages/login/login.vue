<!-- 登录页面 -->
<template>
	<view class="container">
		<view class="content">
			<view class="header">
				<text class="title">学生登录</text>
			</view>
			
			<view class="form-container">
				<view class="input-group">
					<text class="label">身份证</text>
					<input 
						class="input" 
						type="text" 
						v-model="loginForm.loginAccount" 
						:disabled="loading"
					/>
				</view>
				
				<view class="input-group">
					<text class="label">密码</text>
					<input 
						class="input" 
						type="password" 
						v-model="loginForm.password" 
						:disabled="loading"
					/>
				</view>
				
				<view class="input-group">
					<text class="label">毕业年份</text>
					<picker 
						class="year-picker" 
						mode="selector" 
						:range="yearOptions" 
						:value="yearIndex"
						@change="onYearChange"
						:disabled="loading"
					>
						<view class="picker-text">
							{{ loginForm.enrollmentYear }}
						</view>
					</picker>
				</view>
				
				<button class="login-btn" @click="handleLogin" :disabled="loading || !loginForm.loginAccount || !loginForm.password || !loginForm.enrollmentYear">
					{{ loading ? '登录中...' : '登 录' }}
				</button>
			</view>
		</view>
	</view>
</template>

<script>
import { userLogin, getUserInfo } from '@/api/sign'

export default {
	data() {
		return {
			loading: false,
			loginForm: {
				loginAccount: '',
				password: '',
				enrollmentYear: '2025',
				rememberMe: true,
				loginUserType: 'student'
			},
			yearOptions: Array.from({ length: 16 }, (_, i) => (2015 + i).toString())
		}
	},
	computed: {
		yearIndex() {
			const index = this.yearOptions.indexOf(this.loginForm.enrollmentYear)
			return index === -1 ? this.yearOptions.indexOf('2025') : index
		}
	},
	methods: {
		onYearChange(e) {
			this.loginForm.enrollmentYear = this.yearOptions[e.detail.value]
		},
		async handleLogin() {
			if (!this.loginForm.loginAccount || !this.loginForm.password || !this.loginForm.enrollmentYear) {
				uni.showToast({
					title: '请填写完整信息',
					icon: 'none'
				})
				return
			}

			this.loading = true
			try {
				// 1. 登录获取token
				const loginRes = await userLogin(this.loginForm)
				if (loginRes.code === 200) {
					// 保存token
					uni.setStorageSync('token', loginRes.token)
					// 保存登录信息用于token刷新
					uni.setStorageSync('userInfo', {
						loginAccount: this.loginForm.loginAccount,
						password: this.loginForm.password,
						enrollmentYear: this.loginForm.enrollmentYear
					})
					
					// 2. 获取用户信息
					const userRes = await getUserInfo()
					if (userRes.code === 200) {
						const autonomyPlan = userRes.data.autonomyPlan
						const userInfo = {
							autonomyId: autonomyPlan.id,
							userId: autonomyPlan.userId,
							nickName: autonomyPlan.nickName,
							practicePlace: autonomyPlan.practicePlace
						}
						// 保存用户信息
						uni.setStorageSync('userInfo', userInfo)
						
						uni.showToast({
							title: '登录成功',
							icon: 'success'
						})
						
						// 延迟跳转,让用户看到提示
						setTimeout(() => {
							uni.reLaunch({
								url: '/pages/index/index'
							})
						}, 1500)
					} else {
						throw new Error('获取用户信息失败')
					}
				} else {
					uni.showToast({
						title: loginRes.msg || '登录失败',
						icon: 'none'
					})
				}
			} catch (e) {
				uni.showToast({
					title: e.message || '登录失败',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: transparent;
	display: flex;
	flex-direction: column;
	padding: 0 40rpx;
	box-sizing: border-box;
	
	.header {
		margin-top: 160rpx;
		margin-bottom: 100rpx;
		text-align: center;
		
		.title {
			font-size: 56rpx;
			font-weight: 600;
			color: #c1c1c1;
			letter-spacing: 4rpx;
		}
	}
	
	.form-container {
		.input-group {
			margin-bottom: 40rpx;
			
			.label {
				display: block;
				font-size: 28rpx;
				color: #808080;
				margin-bottom: 12rpx;
				padding-left: 4rpx;
			}
			
			.input {
				width: 100%;
				height: 100rpx;
				background: #1E1F22;
				border-radius: 16rpx;
				padding: 0 24rpx;
				font-size: 32rpx;
				transition: all 0.3s;
				box-sizing: border-box;
				color: #c1c1c1;
				
				&:focus {
					background: #2B2D30;
					box-shadow: 0 0 0 2rpx rgba(0,102,255,0.2);
				}
				
				&:disabled {
					opacity: 0.7;
				}
			}
			
			.year-picker {
				width: 100%;
				height: 100rpx;
				background: #1E1F22;
				border-radius: 16rpx;
				padding: 0 24rpx;
				display: flex;
				align-items: center;
				transition: all 0.3s;
				box-sizing: border-box;
				
				&:active {
					background: #2B2D30;
					box-shadow: 0 0 0 2rpx rgba(0,102,255,0.2);
				}
				
				.picker-text {
					font-size: 32rpx;
					color: #c1c1c1;
				}
			}
		}
		
		.login-btn {
			width: 100%;
			height: 100rpx;
			line-height: 100rpx;
			background: #0066ff;
			color: #fff;
			font-size: 36rpx;
			border-radius: 16rpx;
			margin-top: 60rpx;
			box-sizing: border-box;
			
			&:disabled {
				opacity: 0.7;
				background: #2B2D30;
			}
			
			&:active {
				transform: scale(0.98);
			}
		}
	}
}
</style> 