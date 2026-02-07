import React, { useState } from 'react'
import { Heart, Droplets, Moon, Pill, Utensils, TrendingUp, Calendar, BarChart3 } from 'lucide-react'
import { useHealthStore } from '../stores/healthStore'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

export const HealthDashboard: React.FC = () => {
  const { 
    bloodPressures, 
    bloodSugars, 
    sleepData, 
    medications, 
    meals 
  } = useHealthStore()

  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week')

  // 获取最近的数据
  const getRecentData = (data: any[], days: number) => {
    const cutoffDate = subDays(new Date(), days)
    return data.filter(item => new Date(item.timestamp) >= cutoffDate)
  }

  // 计算平均值
  const calculateAverage = (data: any[], field: string) => {
    if (data.length === 0) return 0
    const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0)
    return Math.round((sum / data.length) * 10) / 10
  }

  // 获取异常数据数量
  const getAbnormalCount = (data: any[]) => {
    return data.filter(item => item.isAbnormal).length
  }

  // 获取本周数据
  const weekData = {
    bloodPressures: getRecentData(bloodPressures, 7),
    bloodSugars: getRecentData(bloodSugars, 7),
    sleepData: getRecentData(sleepData, 7),
    medications: getRecentData(medications, 7),
    meals: getRecentData(meals, 7)
  }

  // 计算统计数据
  const stats = {
    avgSystolic: calculateAverage(weekData.bloodPressures, 'systolic'),
    avgDiastolic: calculateAverage(weekData.bloodPressures, 'diastolic'),
    avgBloodSugar: calculateAverage(weekData.bloodSugars, 'value'),
    avgSleepDuration: calculateAverage(weekData.sleepData, 'duration'),
    avgSleepQuality: calculateAverage(weekData.sleepData, 'quality'),
    medicationCompliance: weekData.medications.length > 0 ? 
      Math.round((weekData.medications.filter(m => m.taken).length / weekData.medications.length) * 100) : 0,
    abnormalBPCount: getAbnormalCount(weekData.bloodPressures),
    abnormalBSCount: getAbnormalCount(weekData.bloodSugars)
  }

  // 准备图表数据
  const prepareChartData = () => {
    const days = timeRange === 'week' ? 7 : 30
    const dates = Array.from({ length: days }, (_, i) => 
      format(subDays(new Date(), days - 1 - i), 'MM/dd')
    )

    return dates.map((date, index) => {
      const dateObj = subDays(new Date(), days - 1 - index)
      const dayData = {
        date,
        systolic: 0,
        diastolic: 0,
        bloodSugar: 0,
        sleepDuration: 0,
        sleepQuality: 0
      }

      // 获取当天的数据
      const dayBP = bloodPressures.filter(bp => 
        format(new Date(bp.timestamp), 'MM/dd') === date
      )
      const dayBS = bloodSugars.filter(bs => 
        format(new Date(bs.timestamp), 'MM/dd') === date
      )
      const daySleep = sleepData.filter(sleep => 
        format(new Date(sleep.timestamp), 'MM/dd') === date
      )

      if (dayBP.length > 0) {
        dayData.systolic = calculateAverage(dayBP, 'systolic')
        dayData.diastolic = calculateAverage(dayBP, 'diastolic')
      }

      if (dayBS.length > 0) {
        dayData.bloodSugar = calculateAverage(dayBS, 'value')
      }

      if (daySleep.length > 0) {
        dayData.sleepDuration = calculateAverage(daySleep, 'duration')
        dayData.sleepQuality = calculateAverage(daySleep, 'quality')
      }

      return dayData
    })
  }

  const chartData = prepareChartData()

  // 用药依从性饼图数据
  const medicationData = [
    { name: '已服用', value: medications.filter(m => m.taken).length, color: '#10b981' },
    { name: '未服用', value: medications.filter(m => !m.taken).length, color: '#ef4444' }
  ]

  return (
    <div className="space-y-6">
      {/* 时间范围选择 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-blue-500" />
          健康数据仪表盘
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'week'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            本周
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            本月
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 血压统计 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span className={`text-xs px-2 py-1 rounded-full ${
              stats.abnormalBPCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {stats.abnormalBPCount > 0 ? `${stats.abnormalBPCount}次异常` : '正常'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">血压</h3>
          <p className="text-2xl font-bold text-red-500">
            {stats.avgSystolic}/{stats.avgDiastolic}
          </p>
          <p className="text-sm text-gray-600">mmHg</p>
        </div>

        {/* 血糖统计 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Droplets className="w-5 h-5 text-green-500" />
            <span className={`text-xs px-2 py-1 rounded-full ${
              stats.abnormalBSCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {stats.abnormalBSCount > 0 ? `${stats.abnormalBSCount}次异常` : '正常'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">血糖</h3>
          <p className="text-2xl font-bold text-green-500">
            {stats.avgBloodSugar}
          </p>
          <p className="text-sm text-gray-600">mmol/L</p>
        </div>

        {/* 睡眠统计 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Moon className="w-5 h-5 text-blue-500" />
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
              平均
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">睡眠</h3>
          <p className="text-2xl font-bold text-blue-500">
            {stats.avgSleepDuration}
          </p>
          <p className="text-sm text-gray-600">小时/质量{stats.avgSleepQuality}/5</p>
        </div>

        {/* 用药依从性 */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Pill className="w-5 h-5 text-purple-500" />
            <span className={`text-xs px-2 py-1 rounded-full ${
              stats.medicationCompliance >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {stats.medicationCompliance >= 80 ? '良好' : '需改善'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">用药依从性</h3>
          <p className="text-2xl font-bold text-purple-500">
            {stats.medicationCompliance}%
          </p>
          <p className="text-sm text-gray-600">本周完成率</p>
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 血压趋势 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            血压趋势
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} name="收缩压" />
              <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} name="舒张压" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 血糖趋势 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Droplets className="w-5 h-5 mr-2 text-green-500" />
            血糖趋势
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="bloodSugar" stroke="#10b981" strokeWidth={2} name="血糖值" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 睡眠和用药图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 睡眠质量 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Moon className="w-5 h-5 mr-2 text-blue-500" />
            睡眠质量趋势
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="sleepQuality" fill="#3b82f6" name="睡眠质量" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 用药依从性饼图 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Pill className="w-5 h-5 mr-2 text-purple-500" />
            用药依从性
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={medicationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {medicationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-4 mt-4">
            {medicationData.map((item) => (
              <div key={item.name} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 健康建议 */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">健康建议</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">血压管理</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 保持规律作息，避免熬夜</li>
              <li>• 减少盐分摄入，饮食清淡</li>
              <li>• 适量运动，如散步、太极</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">血糖控制</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 控制碳水化合物摄入</li>
              <li>• 多吃蔬菜和优质蛋白</li>
              <li>• 按时服药，定期监测</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}