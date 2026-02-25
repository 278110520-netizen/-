// Cordova 应用入口文件
document.addEventListener('deviceready', onDeviceReady, false);

// 全局变量
let camera = null;
let currentCamera = Camera.Direction.FRONT;
let isCameraOn = false;
let capturedImage = null;
let db = null;

// 应用初始化
function onDeviceReady() {
    console.log('Cordova 设备就绪');
    
    // 初始化数据库
    initDatabase();
    
    // 检查权限
    checkPermissions();
    
    // 初始化事件监听
    initEventListeners();
    
    // 初始化UI
    initUI();
    
    // 隐藏启动画面
    setTimeout(() => {
        document.getElementById('appLoading').classList.add('hidden');
    }, 2000);
}

// 初始化数据库
function initDatabase() {
    const request = indexedDB.open('SelfieTrackerDB', 1);
    
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        
        // 创建自拍存储
        if (!db.objectStoreNames.contains('selfies')) {
            const selfieStore = db.createObjectStore('selfies', { keyPath: 'id', autoIncrement: true });
            selfieStore.createIndex('by_date', 'date', { unique: false });
            selfieStore.createIndex('by_timestamp', 'timestamp', { unique: true });
        }
        
        // 创建设置存储
        if (!db.objectStoreNames.contains('settings')) {
            const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // 创建统计存储
        if (!db.objectStoreNames.contains('stats')) {
            const statsStore = db.createObjectStore('stats', { keyPath: 'key' });
        }
    };
    
    request.onsuccess = function(event) {
        db = event.target.result;
        console.log('数据库初始化成功');
        
        // 加载用户数据
        loadUserData();
    };
    
    request.onerror = function(event) {
        console.error('数据库初始化失败:', event.target.error);
    };
}

// 检查权限
function checkPermissions() {
    if (cordova.platformId === 'android') {
        // 检查Android权限
        checkAndroidPermissions();
    } else if (cordova.platformId === 'ios') {
        // 检查iOS权限
        checkIOSPermissions();
    }
}

// 检查Android权限
function checkAndroidPermissions() {
    const permissions = cordova.plugins.permissions;
    
    permissions.checkPermission(permissions.CAMERA, function(status) {
        if (!status.hasPermission) {
            showPermissionModal();
        } else {
            startCamera();
        }
    });
}

// 检查iOS权限
function checkIOSPermissions() {
    // iOS权限检查通常在使用功能时自动触发
    startCamera();
}

// 显示权限请求弹窗
function showPermissionModal() {
    document.getElementById('permissionModal').classList.remove('hidden');
}

// 授予权限
function grantPermission() {
    if (cordova.platformId === 'android') {
        const permissions = cordova.plugins.permissions;
        permissions.requestPermission(permissions.CAMERA, function(status) {
            if (status.hasPermission) {
                document.getElementById('permissionModal').classList.add('hidden');
                startCamera();
            } else {
                alert('需要相机权限才能使用此应用');
            }
        });
    } else {
        document.getElementById('permissionModal').classList.add('hidden');
        startCamera();
    }
}

// 拒绝权限
function denyPermission() {
    document.getElementById('permissionModal').classList.add('hidden');
    alert('您可以稍后在系统设置中授予相机权限');
}

// 启动相机
function startCamera() {
    const video = document.getElementById('cameraPreview');
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function(stream) {
                video.srcObject = stream;
                isCameraOn = true;
            })
            .catch(function(error) {
                console.error('获取相机失败:', error);
                alert('无法访问相机，请检查权限设置');
            });
    } else {
        alert('您的设备不支持相机访问');
    }
}

// 切换相机
function switchCamera() {
    if (!isCameraOn) return;
    
    const video = document.getElementById('cameraPreview');
    const stream = video.srcObject;
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    currentCamera = currentCamera === Camera.Direction.FRONT ? 
        Camera.Direction.BACK : Camera.Direction.FRONT;
    
    const constraints = {
        video: {
            facingMode: currentCamera === Camera.Direction.FRONT ? 'user' : 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        },
        audio: false
    };
    
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(newStream) {
            video.srcObject = newStream;
        })
        .catch(function(error) {
            console.error('切换相机失败:', error);
        });
}

// 拍照
function capturePhoto() {
    if (!isCameraOn) return;
    
    const video = document.getElementById('cameraPreview');
    const canvas = document.getElementById('canvas');
    const capturedImg = document.getElementById('capturedImage');
    
    // 设置画布尺寸
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // 绘制视频帧到画布
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 转换为图片
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    capturedImg.src = imageData;
    capturedImage = imageData;
    
    // 显示拍摄的图片和编辑选项
    video.classList.add('hidden');
    capturedImg.classList.remove('hidden');
    document.getElementById('editOptions').classList.remove('hidden');
    
    // 添加快门动画
    document.getElementById('captureBtn').classList.add('camera-shutter');
    setTimeout(() => {
        document.getElementById('captureBtn').classList.remove('camera-shutter');
    }, 500);
}

// 重拍
function retakePhoto() {
    const video = document.getElementById('cameraPreview');
    const capturedImg = document.getElementById('capturedImage');
    
    video.classList.remove('hidden');
    capturedImg.classList.add('hidden');
    document.getElementById('editOptions').classList.add('hidden');
    
    capturedImage = null;
}

// 保存照片
function savePhoto() {
    if (!capturedImage) return;
    
    const selfieData = {
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        image: capturedImage,
        notes: '',
        location: null,
        mood: null
    };
    
    // 保存到数据库
    const transaction = db.transaction(['selfies'], 'readwrite');
    const store = transaction.objectStore('selfies');
    const request = store.add(selfieData);
    
    request.onsuccess = function() {
        console.log('照片保存成功');
        
        // 更新统计数据
        updateStats();
        
        // 重置相机
        retakePhoto();
        
        // 显示成功提示
        showToast('打卡成功！已连续打卡 ' + getStreakCount() + ' 天');
        
        // 重新加载数据
        loadUserData();
    };
    
    request.onerror = function(event) {
        console.error('保存照片失败:', event.target.error);
        showToast('保存失败，请重试');
    };
}

// 从相册导入
function importFromGallery() {
    const options = {
        quality: 0.9,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        mediaType: Camera.MediaType.PICTURE,
        encodingType: Camera.EncodingType.JPEG,
        allowEdit: true,
        targetWidth: 1280,
        targetHeight: 720
    };
    
    navigator.camera.getPicture(function(imageData) {
        const capturedImg = document.getElementById('capturedImage');
        const video = document.getElementById('cameraPreview');
        
        capturedImage = 'data:image/jpeg;base64,' + imageData;
        capturedImg.src = capturedImage;
        
        video.classList.add('hidden');
        capturedImg.classList.remove('hidden');
        document.getElementById('editOptions').classList.remove('hidden');
        
    }, function(error) {
        console.error('从相册导入失败:', error);
    }, options);
}

// 切换参考线
function toggleReferenceLines() {
    const overlay = document.getElementById('referenceOverlay');
    overlay.classList.toggle('hidden');
}

// 切换同比例框
function toggleCompareFrame() {
    // 实现同比例框功能
    showToast('同比例框功能开发中');
}

// 切换美颜
function toggleBeautyMode() {
    showToast('美颜功能开发中');
}

// 切换闪光灯
function toggleFlash() {
    showToast('闪光灯功能开发中');
}

// 页面导航
function navigateTo(pageId) {
    // 隐藏所有页面
    const pages = ['cameraPage', 'timelinePage', 'comparePage', 'insightsPage', 'profilePage'];
    pages.forEach(page => {
        document.getElementById(page).classList.add('hidden');
    });
    
    // 显示目标页面
    document.getElementById(pageId).classList.remove('hidden');
    
    // 更新导航栏状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-primary');
        btn.classList.add('text-gray-500');
    });
    
    const activeBtn = document.querySelector(`[data-page="${pageId}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-500');
        activeBtn.classList.add('text-primary');
    }
    
    // 页面特定初始化
    if (pageId === 'timelinePage') {
        initTimelinePage();
    } else if (pageId === 'insightsPage') {
        initInsightsPage();
    } else if (pageId === 'profilePage') {
        initProfilePage();
    }
}

// 初始化时间线页面
function initTimelinePage() {
    generateCalendar();
    loadPhotosGrid();
}

// 初始化洞察页面
function initInsightsPage() {
    initInsightsChart();
}

// 初始化个人中心页面
function initProfilePage() {
    initActivityChart();
}

// 生成日历
function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthElement = document.getElementById('currentMonth');
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    currentMonthElement.textContent = `${year}年${month + 1}月`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    calendarGrid.innerHTML = '';
    
    // 空白单元格
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'text-center py-2 text-gray-300';
        calendarGrid.appendChild(emptyCell);
    }
    
    // 日期单元格
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'text-center py-2 rounded-full cursor-pointer transition-colors';
        
        // 检查是否有自拍记录
        if (hasSelfieOnDate(year, month, day)) {
            dayCell.classList.add('bg-blue-100', 'text-blue-600', 'font-medium');
        } else {
            dayCell.classList.add('hover:bg-gray-100');
        }
        
        dayCell.textContent = day;
        calendarGrid.appendChild(dayCell);
    }
}

// 检查指定日期是否有自拍
function hasSelfieOnDate(year, month, day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // 这里应该查询数据库，暂时返回模拟数据
    const hasSelfie = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23].includes(day);
    return hasSelfie;
}

// 加载照片网格
function loadPhotosGrid() {
    const photosGrid = document.getElementById('photosGrid');
    photosGrid.innerHTML = '';
    
    // 模拟数据
    const mockPhotos = [
        { id: 1, date: '2025-07-23', image: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%233B82F6" width="100" height="100"/><text fill="white" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">7月23日</text></svg>' },
        { id: 2, date: '2025-07-22', image: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23EC4899" width="100" height="100"/><text fill="white" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">7月22日</text></svg>' },
        { id: 3, date: '2025-07-21', image: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" width="100" height="100"/><text fill="white" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">7月21日</text></svg>' },
        { id: 4, date: '2025-07-20', image: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%2310B981" width="100" height="100"/><text fill="white" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">7月20日</text></svg>' },
        { id: 5, date: '2025-07-19', image: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23F59E0B" width="100" height="100"/><text fill="white" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">7月19日</text></svg>' },
        { id: 6, date: '2025-07-18', image: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23EF4444" width="100" height="100"/><text fill="white" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">7月18日</text></svg>' },
    ];
    
    mockPhotos.forEach(photo => {
        const photoItem = document.createElement('div');
        photoItem.className = 'aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow';
        
        const img = document.createElement('img');
        img.src = photo.image;
        img.className = 'w-full h-full object-cover';
        img.alt = photo.date;
        
        photoItem.appendChild(img);
        photosGrid.appendChild(photoItem);
    });
}

// 初始化洞察图表
function initInsightsChart() {
    const ctx = document.getElementById('insightsChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
            datasets: [{
                label: '打卡频率',
                data: [15, 18, 22, 19, 25, 28, 23],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 初始化活动图表
function initActivityChart() {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            datasets: [{
                label: '打卡记录',
                data: [5, 7, 6, 8, 4, 3, 2],
                backgroundColor: '#3B82F6',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 更新统计数据
function updateStats() {
    // 更新连续打卡天数
    const streakCount = getStreakCount();
    document.getElementById('streakCount').textContent = streakCount + '天';
    
    // 更新总打卡天数
    const totalCount = getTotalCount();
    document.getElementById('totalCount').textContent = totalCount + '天';
    
    // 更新进度环
    updateProgressRing(streakCount);
}

// 获取连续打卡天数
function getStreakCount() {
    // 这里应该从数据库计算，暂时返回模拟数据
    return 7;
}

// 获取总打卡天数
function getTotalCount() {
    // 这里应该从数据库计算，暂时返回模拟数据
    return 23;
}

// 更新进度环
function updateProgressRing(streak) {
    const circle = document.getElementById('progressCircle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    
    const percentage = Math.min(streak / 30, 1); // 30天为满环
    const offset = circumference - percentage * circumference;
    
    circle.style.strokeDashoffset = offset;
}

// 加载用户数据
function loadUserData() {
    updateStats();
    loadPhotosGrid();
}

// 生成变化视频
function generateChangeVideo() {
    showToast('视频生成中，请稍候...');
    
    // 模拟视频生成过程
    setTimeout(() => {
        showToast('视频生成成功！');
    }, 3000);
}

// 生成智能分析
function generateAIAnalysis() {
    showToast('智能分析中，请稍候...');
    
    // 模拟分析过程
    setTimeout(() => {
        document.getElementById('aiAnalysis').classList.remove('hidden');
        showToast('分析完成！');
    }, 2000);
}

// 显示提示信息
function showToast(message) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'fixed top-1/4 left-1/2 transform -translate-x-1/2 bg-black/75 text-white px-4 py-2 rounded-lg z-50 animate-fade-in';
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 2秒后移除
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2000);
}

// 初始化事件监听
function initEventListeners() {
    // 导航按钮
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = btn.getAttribute('data-page');
            navigateTo(pageId);
        });
    });
    
    // 相机控制
    document.getElementById('captureBtn').addEventListener('click', capturePhoto);
    document.getElementById('switchCameraBtn').addEventListener('click', switchCamera);
    document.getElementById('retakeBtn').addEventListener('click', retakePhoto);
    document.getElementById('saveBtn').addEventListener('click', savePhoto);
    document.getElementById('galleryBtn').addEventListener('click', importFromGallery);
    document.getElementById('referenceBtn').addEventListener('click', toggleReferenceLines);
    document.getElementById('beautyBtn').addEventListener('click', toggleBeautyMode);
    document.getElementById('flashBtn').addEventListener('click', toggleFlash);
    
    // 拍摄辅助
    document.getElementById('referenceLineBtn').addEventListener('click', toggleReferenceLines);
    document.getElementById('compareFrameBtn').addEventListener('click', toggleCompareFrame);
    document.getElementById('importFromGalleryBtn').addEventListener('click', importFromGallery);
    
    // 对比工具
    document.getElementById('sideBySideBtn').addEventListener('click', () => {
        document.getElementById('sideBySideView').classList.remove('hidden');
        document.getElementById('topBottomView').classList.add('hidden');
        document.getElementById('sliderView').classList.add('hidden');
        document.getElementById('overlayView').classList.add('hidden');
        document.getElementById('opacitySliderContainer').classList.add('hidden');
    });
    
    document.getElementById('topBottomBtn').addEventListener('click', () => {
        document.getElementById('sideBySideView').classList.add('hidden');
        document.getElementById('topBottomView').classList.remove('hidden');
        document.getElementById('sliderView').classList.add('hidden');
        document.getElementById('overlayView').classList.add('hidden');
        document.getElementById('opacitySliderContainer').classList.add('hidden');
    });
    
    document.getElementById('sliderBtn').addEventListener('click', () => {
        document.getElementById('sideBySideView').classList.add('hidden');
        document.getElementById('topBottomView').classList.add('hidden');
        document.getElementById('sliderView').classList.remove('hidden');
        document.getElementById('overlayView').classList.add('hidden');
        document.getElementById('opacitySliderContainer').classList.add('hidden');
    });
    
    document.getElementById('overlayBtn').addEventListener('click', () => {
        document.getElementById('sideBySideView').classList.add('hidden');
        document.getElementById('topBottomView').classList.add('hidden');
        document.getElementById('sliderView').classList.add('hidden');
        document.getElementById('overlayView').classList.remove('hidden');
        document.getElementById('opacitySliderContainer').classList.remove('hidden');
    });
    
    // 透明度滑块
    document.getElementById('opacitySlider').addEventListener('input', (e) => {
        const opacity = e.target.value / 100;
        document.getElementById('overlayTop').style.opacity = opacity;
        e.target.nextElementSibling.children[1].textContent = e.target.value + '%';
    });
    
    // 洞察功能
    document.getElementById('generateVideoBtn').addEventListener('click', generateChangeVideo);
    document.getElementById('generateAnalysisBtn').addEventListener('click', generateAIAnalysis);
    
    // 通知和设置
    document.getElementById('notificationBtn').addEventListener('click', () => {
        document.getElementById('notificationModal').classList.remove('hidden');
    });
    
    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.remove('hidden');
    });
    
    document.getElementById('closeNotificationBtn').addEventListener('click', () => {
        document.getElementById('notificationModal').classList.add('hidden');
    });
    
    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('hidden');
    });
    
    // 权限处理
    document.getElementById('grantPermissionBtn').addEventListener('click', grantPermission);
    document.getElementById('denyPermissionBtn').addEventListener('click', denyPermission);
    
    // 其他功能按钮
    document.getElementById('clearCompareBtn').addEventListener('click', () => {
        // 清空对比选择
        showToast('已清空选择');
    });
    
    document.getElementById('addNoteBtn').addEventListener('click', () => {
        showToast('添加备注功能开发中');
    });
    
    document.getElementById('drawOnImageBtn').addEventListener('click', () => {
        showToast('标记功能开发中');
    });
    
    document.getElementById('saveComparisonBtn').addEventListener('click', () => {
        showToast('对比结果已保存');
    });
    
    document.getElementById('exportDataBtn').addEventListener('click', () => {
        showToast('数据导出中...');
    });
    
    document.getElementById('clearDataBtn').addEventListener('click', () => {
        if (confirm('确定要清除所有数据吗？此操作不可恢复。')) {
            showToast('数据已清除');
        }
    });
    
    // 日历导航
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        showToast('切换到上个月');
    });
    
    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        showToast('切换到下个月');
    });
    
    // 点击模态框背景关闭
    document.getElementById('notificationModal').addEventListener('click', (e) => {
        if (e.target.id === 'notificationModal') {
            e.target.classList.add('hidden');
        }
    });
    
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
            e.target.classList.add('hidden');
        }
    });
    
    // 点击对比照片选择区域
    document.getElementById('comparePhoto1').addEventListener('click', () => {
        showToast('请从相册选择第一张照片');
    });
    
    document.getElementById('comparePhoto2').addEventListener('click', () => {
        showToast('请从相册选择第二张照片');
    });
    
    // 提醒设置
    document.getElementById('reminderToggle').addEventListener('change', (e) => {
        showToast(e.target.checked ? '已开启每日提醒' : '已关闭每日提醒');
    });
    
    document.getElementById('appLockToggle').addEventListener('change', (e) => {
        showToast(e.target.checked ? '已开启应用锁' : '已关闭应用锁');
    });
    
    document.getElementById('backupToggle').addEventListener('change', (e) => {
        showToast(e.target.checked ? '已开启自动备份' : '已关闭自动备份');
    });
}

// 设置当前日期
function setCurrentDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('zh-CN', options);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    setCurrentDate();
    
    // 设置每日激励语
    const motivations = [
        '今天的你比昨天更美好！',
        '记录每一个精彩的自己！',
        '坚持就是胜利，继续加油！',
        '每一天都是新的开始！',
        '你的变化，我们一起见证！'
    ];
    
    const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];
    document.getElementById('dailyMotivation').textContent = randomMotivation;
    
    // 设置每日提示
    const tips = [
        '尝试在自然光源下拍摄，光线从侧面照射可以更好地展现面部轮廓。',
        '保持放松的表情，拍出最自然的自己！',
        '尝试不同的角度，发现最美的自己。',
        '今天的心情如何？让笑容成为最好的装饰品。',
        '注意背景的整洁，让焦点集中在你的脸上。'
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    document.getElementById('dailyTip').textContent = randomTip;
});

// 处理应用暂停和恢复
document.addEventListener('pause', function() {
    console.log('应用进入后台');
});

document.addEventListener('resume', function() {
    console.log('应用恢复前台');
    // 检查相机状态并重新启动
    if (!isCameraOn) {
        startCamera();
    }
});

// 处理应用退出
document.addEventListener('exit', function() {
    console.log('应用退出');
    // 清理资源
    const video = document.getElementById('cameraPreview');
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
});