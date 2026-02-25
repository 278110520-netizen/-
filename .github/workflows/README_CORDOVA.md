# 每日自拍 - Cordova打包指南

## 项目概述

这是一个基于Cordova的每日自拍记录应用，将Web版本的自拍应用转换为可安装的原生移动应用。应用支持Android和iOS平台，提供相机拍摄、照片管理、对比分析等功能。

## 环境准备

### 系统要求

- **Node.js**: v14.0.0 或更高版本
- **npm**: v6.0.0 或更高版本
- **Git**: 最新版本
- **Java JDK**: v8 或 v11 (Android开发)
- **Android Studio**: 最新版本 (Android开发)
- **Xcode**: 最新版本 (iOS开发，仅macOS)
- **CocoaPods**: 最新版本 (iOS开发)

### 安装Cordova CLI

```bash
npm install -g cordova
```

## 项目结构

```
cordova_selfie_app/
├── config.xml              # Cordova配置文件
├── package.json            # npm配置文件
├── www/                    # Web资源目录
│   ├── index.html          # 主页面
│   ├── js/                 # JavaScript文件
│   │   └── index.js        # 主脚本文件
│   └── img/                # 图片资源
├── res/                    # 原生资源目录
│   ├── icon/               # 应用图标
│   │   ├── android/        # Android图标
│   │   └── ios/            # iOS图标
│   └── screen/             # 启动画面
│       ├── android/        # Android启动画面
│       └── ios/            # iOS启动画面
└── platforms/              # 平台构建目录 (自动生成)
```

## 安装依赖

在项目根目录执行：

```bash
npm install
```

## 添加平台

### 添加Android平台

```bash
cordova platform add android
```

### 添加iOS平台

```bash
cordova platform add ios
```

## 安装插件

项目已在`config.xml`中配置了所需插件，执行以下命令安装：

```bash
cordova prepare
```

### 主要插件说明

- **cordova-plugin-camera**: 相机访问
- **cordova-plugin-file**: 文件系统访问
- **cordova-plugin-media-capture**: 媒体捕获
- **cordova-plugin-local-notification**: 本地通知
- **cordova-plugin-biometric-auth**: 生物识别认证
- **cordova-plugin-secure-storage**: 安全存储
- **cordova-plugin-android-permissions**: Android权限管理
- **cordova-plugin-ios-camera-permissions**: iOS相机权限

## 构建应用

### 构建Android应用

```bash
# 开发版本
cordova build android

# 发布版本
cordova build android --release
```

### 构建iOS应用

```bash
# 开发版本
cordova build ios

# 发布版本
cordova build ios --release
```

## 运行应用

### 在Android设备上运行

```bash
cordova run android --device
```

### 在iOS设备上运行

```bash
cordova run ios --device
```

## 签名和发布

### Android应用签名

1. 生成签名密钥：

```bash
keytool -genkey -v -keystore selfie-release-key.keystore -alias selfie -keyalg RSA -keysize 2048 -validity 10000
```

2. 创建`build.json`文件：

```json
{
  "android": {
    "release": {
      "keystore": "selfie-release-key.keystore",
      "alias": "selfie",
      "storePassword": "your-keystore-password",
      "password": "your-key-password"
    }
  }
}
```

3. 签名构建：

```bash
cordova build android --release -- --keystore=build.json
```

### iOS应用签名

iOS应用签名需要在Xcode中进行：

1. 打开生成的Xcode项目：

```bash
open platforms/ios/每日自拍.xcworkspace
```

2. 在Xcode中配置开发者账号和签名证书
3. 选择目标设备并构建/归档

## 权限配置

### Android权限

应用需要以下权限：
- `CAMERA`: 相机访问
- `WRITE_EXTERNAL_STORAGE`: 写入存储
- `READ_EXTERNAL_STORAGE`: 读取存储
- `RECORD_AUDIO`: 录音
- `VIBRATE`: 振动
- `SCHEDULE_EXACT_ALARM`: 精确闹钟

### iOS权限

应用需要以下权限：
- 相机权限 (NSCameraUsageDescription)
- 照片库权限 (NSPhotoLibraryUsageDescription)
- 照片库添加权限 (NSPhotoLibraryAddUsageDescription)
- 麦克风权限 (NSMicrophoneUsageDescription)
- Face ID权限 (NSFaceIDUsageDescription)

## 开发注意事项

### 权限处理

应用在启动时会检查并请求相机权限。如果用户拒绝权限，应用会显示提示并引导用户在系统设置中授予权限。

### 数据存储

- **IndexedDB**: 存储自拍照片数据
- **localStorage**: 存储用户设置和基本信息
- **SecureStorage**: 存储敏感信息（如应用锁密码）

### 性能优化

- 图片压缩：拍摄的照片会进行适当压缩
- 延迟加载：时间线页面采用延迟加载机制
- 资源缓存：静态资源进行本地缓存

### 兼容性

- 支持Android 5.1 (API 22)及以上版本
- 支持iOS 12.0及以上版本
- 适配不同屏幕尺寸和方向

## 调试

### 调试Android应用

```bash
# 查看日志
adb logcat | grep "每日自拍"

# 使用Chrome调试
chrome://inspect/#devices
```

### 调试iOS应用

```bash
# 使用Safari调试
Safari -> 开发 -> 选择连接的iOS设备
```

## 常见问题解决

### 权限问题

如果应用无法访问相机，请检查：
1. 应用是否正确请求了权限
2. 用户是否在系统设置中授予了权限
3. 设备相机是否可用

### 构建失败

常见构建失败原因：
1. 依赖包版本不兼容
2. SDK版本不匹配
3. 签名配置错误

解决方法：
```bash
# 清理构建缓存
cordova clean

# 更新平台
cordova platform update android
cordova platform update ios

# 重新安装插件
cordova plugin remove <plugin-name>
cordova plugin add <plugin-name>
```

### 数据迁移

从Web版本迁移数据到原生应用：
1. Web版本数据存储在浏览器IndexedDB中
2. 原生应用数据存储在应用沙箱中
3. 如需迁移，可通过导出/导入功能实现

## 版本历史

### v1.0.0 (2025-07-25)
- 初始版本
- 实现基础相机功能
- 支持照片存储和管理
- 添加对比分析功能
- 实现本地通知提醒
- 支持生物识别解锁

## 开发团队

Selfie Tracker Team

## 许可证

MIT License