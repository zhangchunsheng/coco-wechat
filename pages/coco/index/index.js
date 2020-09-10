//index.js
//获取应用实例
const app = getApp();
let preventFlag = true;
import {
    charLength,
    abortRequestTask,
    UTC_TO_GMT
} from '../../../utils/util_coco.js';
import {
    initLocation,
    locationResultType,
} from '../../../bo/location.js';
import { $Toast } from '../../../iview/base/index';

const util = require('../../../utils/util.js');
const api = require('../../../config/api.js');

Page({
    data: {
        currentAddress: '请选择当前位置',
        rightDefault: 'rightDefault',
        cocoBtnTips: '去扫码',
        cityShort: 'bj',
        rightActive1: '',
        rightActive2: '',
        coco_ready: false, // 是否能点击

        location_info: null,
        currentAddressInfo: null,
        servering_city: true, // 当前城市是否已开通轿车服务
        network_error: false, // 预估 网络失败
        currentCityShort: null
    },
    onLoad: function() {
        const vm = this;
        if (app.globalData.locationInfo != null) {
            this.initData();
        }
    },
    onUnload: function() {
        abortRequestTask('order');
       
    },
    onHide:function(){
        this.setData({
            showTravelling:false
        })
    },
    onShow: function() {
        const vm = this;
        // 网络状态
        wx.getNetworkType({
            success: function(res) {
                // 返回网络类型, 有效值：
                // wifi/2g/3g/4g/unknown(Android下不常见的网络类型)/none(无网络)
                if (res.networkType == 'none') {
                    vm.setData({
                        network_error: true
                    })
                } else {
                    vm.setData({
                        network_error: false
                    })
                }
            }
        });
        preventFlag = true;
        if(this.data.currentAddress != "请选择当前位置") {
          this.setData({
              coco_ready: true
          })
        } else {
          this.setData({
              coco_ready: false
          })
        }
        
        // 每次从后台进入前台 都初始化定位地址信息
        if (app.globalData.locationInfo == null) {
            initLocation(function(result) {
                if (result == locationResultType.locationGeoSuccess) {
                    vm.initData();
                } else if (result == locationResultType.locationGeoError) {
                    wx.showToast({
                        title: '无法获取位置',
                        icon: 'none'
                    })
                } else if (result == locationResultType.locationError) {
                    wx.showToast({
                        title: '定位失败',
                        icon: 'none'
                    })
                }
            });
        }
        if (vm.data.currentCityShort) {

        } else if (app.globalData.locationInfo != null && app.globalData.locationInfo.short != null) {
            
        }

        let hasLogin = wx.getStorageSync('hasLogin');
        if (app.globalData.hasLogin || hasLogin) {
            app.globalData.hasLogin = true;
            // 是否有正在行程中的订单
            util.request(api.YopGetCurrentAndUnpayOrder, {}).then(function(res) {
              if (res.errno === 0) {
                let currentTrip = res.data.current_trip;
                let unpayTrip = res.data.unpay_trip;
                if(currentTrip && currentTrip.length >= 1) {
                    // 行程状态标题
                    let orderStatusTip = orderStatusTips[currentTrip[0].order.status];
                    vm.setData({
                        showTravelling: true,
                        travelling_result: currentTrip[0],
                        orderStatusTip
                    })
                } else {
                    vm.setData({
                        showTravelling: false,
                        travelling_result: {},
                        orderStatusTip: ''
                    })
                }
              } else {
                vm.setData({
                    showTravelling: false,
                    travelling_result: {},
                    orderStatusTip: ''
                })
              }
            });
        } else {
            vm.setData({
                showTravelling: false,
                travelling_result: {},
                orderStatusTip: ''
            })
        }
    },
    // 该方法为空 可以在modal层弹出来时 禁止modal下面的页面滑动
    catchtouchmove() {

    },
    initData: function() {
        const cityShort = app.globalData.locationInfo.short;
        this.setData({
            cityShort: cityShort
        });
        if (cityShort != null) {
            // 处理定位获取的地址 看是否需要换行
            let currentAddress = this.omitNewLine(app.globalData.locationInfo.formatted_address, 1);
            this.setData({
                currentAddress
            });
        } else {
            this._showToast('定位失败');
        }
    },
    isNumber: function(val) {
        var regPos = /^\d+(\.\d+)?$/; //非负浮点数
        var regNeg = /^(-(([0-9]+\.[0-9]*[1-9][0-9]*)|([0-9]*[1-9][0-9]*\.[0-9]+)|([0-9]*[1-9][0-9]*)))$/; //负浮点数
        if(regPos.test(val) || regNeg.test(val)) {
            return true;
        } else {
            return false;
        }
    },
    // 选择当前定位
    chooseAddress(e) {
        if (app.globalData.locationInfo != null) {
            wx.navigateTo({
                url: '/pages/coco/searchAddress/searchAddress?flag=' + e.currentTarget.dataset.flag
            })
        } else {
            wx.showModal({
                title: '温馨提示',
                content: '获取位置信息失败，无法使用地图选取地址，请检查网络是否良好，以及是否禁用位置',
            })
        }
    },
    // 地址超过16字符换行处理 以及 第二行末尾加 省略号 并且控制字号大小
    omitNewLine(address, flag) { // flag 1:当前定位样式
        const index = charLength(address)[0];
        const end = charLength(address)[1];
        let currentAddress;
        if (index != 0) {
            this.setData({
                ['rightActive' + flag]: 'lessFont'
            })
            if (end != 0) {
                currentAddress = address.substring(0, index + 1) + '\n' + address.substring(index + 1, end) + '...';
            } else {
                currentAddress = address.substring(0, index + 1) + '\n' + address.substring(index + 1);
            }
            return currentAddress;
        } else {
            this.setData({
                ['rightActive' + flag]: 'largeFont'
            })
            return address
        }
    },
    setCurrentAddress(address, cityShort) {
        const tempAddress = address;
        tempAddress.city_short = cityShort; // 把 城市编码 加入 地址对象
        this.setData({
            currentAddressInfo: tempAddress,
            currentAddress: this.omitNewLine(address.name, 1),
            currentCityShort: cityShort,
            cityShort: cityShort
        });
    },
    coco: function() {

    },
    getCurrentAddress() {
        return this.data.currentAddressInfo
    },
    _showToast: function(content) {
        $Toast({
            content: content
        });
    },
    onShareAppMessage: function() {
      return {
        title: 'coco',
        desc: 'coco',
        path: '/pages/coco/index/index'
      }
    }
});