import React, { useState } from 'react'
import { FileText, Download, Calendar, TrendingUp, Heart, Droplets, Moon, Pill, Utensils } from 'lucide-react'
import { useHealthStore } from '../stores/healthStore'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface MonthlyReportProps {
  onClose: () => void
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ onClose }) => {
  const { 
    bloodPressures, 
    bloodSugars, 
    sleepData, 
    medications, 
    meals,
    getAbnormalReadings 
  } = useHealthStore()

  const [selectedMonth, setSelectedMonth] = useState(new Date())

  // 获取月度数据
  const getMonthlyData = () => {
    const start = startOfMonth(selectedMonth)
    const end = endOfMonth(selectedMonth)
    
    return {
      bloodPressures: bloodPressures.filter(bp => {
        const bpDate = new Date(bp.timestamp)
        return bpDate >= start && bpDate <= end
      }),
      bloodSugars: bloodSugars.filter(bs => {
        const bsDate = new Date(bs.timestamp)
        return bsDate >= start && bsDate <= end
      }),
      sleepData: sleepData.filter(sleep => {
        const sleepDate = new Date(sleep.timestamp)
        return sleepDate >= start && sleepDate <= end
      }),
      medications: medications.filter(med => {
        const medDate = new Date(med.timestamp)
        return medDate >= start && medDate <= end
      }),
      meals: meals.filter(meal => {
        const mealDate = new Date(meal.timestamp)
        return mealDate >= start && mealDate <= end
      })
    }
  }

  const monthlyData = getMonthlyData()

  // 计算月度统计
  const monthlyStats = {
    totalDays: eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth)
    }).length,
    
    avgSystolic: calculateAverage(monthlyData.bloodPressures, 'systolic'),
    avgDiastolic: calculateAverage(monthlyData.bloodPressures, 'diastolic'),
    bpReadings: monthlyData.bloodPressures.length,
    abnormalBP: monthlyData.bloodPressures.filter(bp => bp.isAbnormal).length,
    
    avgBloodSugar: calculateAverage(monthlyData.bloodSugars, 'value'),
    bsReadings: monthlyData.bloodSugars.length,
    abnormalBS: monthlyData.bloodSugars.filter(bs => bs.isAbnormal).length,
    
    avgSleepDuration: calculateAverage(monthlyData.sleepData, 'duration'),
    avgSleepQuality: calculateAverage(monthlyData.sleepData, 'quality'),
    sleepRecords: monthlyData.sleepData.length,
    
    medicationCompliance: monthlyData.medications.length > 0 ?
      Math.round((monthlyData.medications.filter(m => m.taken).length / monthlyData.medications.length) * 100) : 0,
    totalMedications: monthlyData.medications.length,
    
    totalMeals: monthlyData.meals.length,
    healthyMeals: monthlyData.meals.filter(meal => 
      meal.tags.some(tag => ['低盐', '低糖', '低脂', '高纤维', '清淡'].includes(tag))
    ).length
  }

  // 健康评分
  const healthScore = calculateHealthScore(monthlyStats)

  function calculateAverage(data: any[], field: string): number {
    if (data.length === 0) return 0
    const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0)
    return Math.round((sum / data.length) * 10) / 10
  }

  function calculateHealthScore(stats: any): number {
    let score = 100
    
    // 血压异常扣分
    if (stats.abnormalBP > 0) score -= Math.min(stats.abnormalBP * 5, 30)
    
    // 血糖异常扣分
    if (stats.abnormalBS > 0) score -= Math.min(stats.abnormalBS * 5, 30)
    
    // 用药依从性加分
    if (stats.medicationCompliance >= 90) score += 10
    else if (stats.medicationCompliance >= 80) score += 5
    else if (stats.medicationCompliance < 50) score -= 15
    
    // 睡眠质量评分
    if (stats.avgSleepQuality >= 4) score += 5
    else if (stats.avgSleepQuality < 3) score -= 10
    
    // 健康饮食加分
    if (stats.healthyMeals > 0) {
      const healthyRatio = stats.healthyMeals / Math.max(stats.totalMeals, 1)
      score += Math.round(healthyRatio * 10)
    }
    
    return Math.max(0, Math.min(100, score))
  }

  // 准备图表数据
  const prepareChartData = () => {
    const days = eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth)
    })

    return days.map(day => {
      const dateStr = format(day, 'MM/dd')
      const dayData = {
        date: dateStr,
        systolic: 0,
        diastolic: 0,
        bloodSugar: 0,
        sleepDuration: 0,
        sleepQuality: 0,
        medications: 0,
        meals: 0
      }

      // 获取当天的数据
      const dayBP = monthlyData.bloodPressures.filter(bp => 
        format(new Date(bp.timestamp), 'MM/dd') === dateStr
      )
      const dayBS = monthlyData.bloodSugars.filter(bs => 
        format(new Date(bs.timestamp), 'MM/dd') === dateStr
      )
      const daySleep = monthlyData.sleepData.filter(sleep => 
        format(new Date(sleep.timestamp), 'MM/dd') === dateStr
      )
      const dayMedications = monthlyData.medications.filter(med => 
        format(new Date(med.timestamp), 'MM/dd') === dateStr
      )
      const dayMeals = monthlyData.meals.filter(meal => 
        format(new Date(meal.timestamp), 'MM/dd') === dateStr
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

      dayData.medications = dayMedications.filter(m => m.taken).length
      dayData.meals = dayMeals.length

      return dayData
    })
  }

  const chartData = prepareChartData()

  // 导出报告
  const exportReport = () => {
    const reportText = `
${format(selectedMonth, 'yyyy年MM月')}健康报告
生成时间：${format(new Date(), 'yyyy年MM月dd日 HH:mm')}

=== 健康评分 ===
综合评分：${healthScore}/100
${getHealthScoreComment(healthScore)}

=== 血压监测 ===
平均收缩压：${monthlyStats.avgSystolic} mmHg
平均舒张压：${monthlyStats.avgDiastolic} mmHg
测量次数：${monthlyStats.bpReadings} 次
异常次数：${monthlyStats.abnormalBP} 次

=== 血糖监测 ===
平均血糖值：${monthlyStats.avgBloodSugar} mmol/L
测量次数：${monthlyStats.bsReadings} 次
异常次数：${monthlyStats.abnormalBS} 次

=== 睡眠记录 ===
平均睡眠时长：${monthlyStats.avgSleepDuration} 小时
平均睡眠质量：${monthlyStats.avgSleepQuality}/5
记录天数：${monthlyStats.sleepRecords} 天

=== 用药管理 ===
用药依从性：${monthlyStats.medicationCompliance}%
总用药次数：${monthlyStats.totalMedications} 次

=== 饮食记录 ===
总餐数：${monthlyStats.totalMeals} 餐
健康餐数：${monthlyStats.healthyMeals} 餐

=== 健康建议 ===
${generateHealthAdvice(monthlyStats)}

=== 下月目标 ===
${generateNextMonthGoals(monthlyStats)}
    `

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `健康月度报告_${format(selectedMonth, 'yyyyMM')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function getHealthScoreComment(score: number): string {
    if (score >= 90) return '健康状况优秀，请继续保持良好的生活习惯。'
    if (score >= 80) return '健康状况良好，继续保持并注意小幅改善。'
    if (score >= 70) return '健康状况一般，建议加强健康管理和生活方式调整。'
    if (score >= 60) return '健康状况需要改善，建议咨询医生并制定改善计划。'
    return '健康状况较差，建议立即就医并严格遵医嘱。'
  }

  function generateHealthAdvice(stats: any): string {
    const advice = []
    
    if (stats.abnormalBP > 0) {
      advice.push('• 血压存在异常，建议减少盐分摄入，保持规律作息')
    }
    
    if (stats.abnormalBS > 0) {
      advice.push('• 血糖存在异常，建议控制碳水化合物摄入，增加运动')
    }
    
    if (stats.medicationCompliance < 80) {
      advice.push('• 用药依从性需要改善，建议设置提醒确保按时服药')
    }
    
    if (stats.avgSleepQuality < 3) {
      advice.push('• 睡眠质量较差，建议改善睡眠环境和作息规律')
    }
    
    if (advice.length === 0) {
      advice.push('• 各项指标正常，请继续保持良好的生活习惯')
    }
    
    return advice.join('\n')
  }

  function generateNextMonthGoals(stats: any): string {
    const goals = []
    
    if (stats.abnormalBP > 0) {
      goals.push('• 血压控制在正常范围内')
    }
    
    if (stats.abnormalBS > 0) {
      goals.push('• 血糖控制在正常范围内')
    }
    
    if (stats.medicationCompliance < 90) {
      goals.push('• 提高用药依从性至90%以上')
    }
    
    if (stats.avgSleepQuality < 4) {
      goals.push('• 提高睡眠质量至4分以上')
    }
    
    goals.push('• 保持规律的运动习惯')
    goals.push('• 继续健康饮食，增加健康餐比例')
    
    return goals.join('\n')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-blue-500" />
            月度健康报告
          </h2>
          <div className="flex items-center space-x-3">
            <input
              type="month"
              value={format(selectedMonth, 'yyyy-MM')}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={exportReport}
              className="bg-green-500 text-white px-4 py-2 rounded-lg text-base font-medium hover:bg-green-600 transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              导出报告
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* 健康评分 */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">健康综合评分</h3>
              <p className="text-gray-600">{format(selectedMonth, 'yyyy年MM月')}整体健康状况</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${
                healthScore >= 90 ? 'text-green-500' :
                healthScore >= 70 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {healthScore}
              </div>
              <div className="text-sm text-gray-600">满分100分</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  healthScore >= 90 ? 'bg-green-500' :
                  healthScore >= 70 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className={`text-xs px-2 py-1 rounded-full ${
                monthlyStats.abnormalBP > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {monthlyStats.abnormalBP > 0 ? `${monthlyStats.abnormalBP}次异常` : '正常'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">血压</h3>
            <p className="text-2xl font-bold text-red-500">
              {monthlyStats.avgSystolic}/{monthlyStats.avgDiastolic}
            </p>
            <p className="text-sm text-gray-600">{monthlyStats.bpReadings}次测量</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Droplets className="w-5 h-5 text-green-500" />
              <span className={`text-xs px-2 py-1 rounded-full ${
                monthlyStats.abnormalBS > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {monthlyStats.abnormalBS > 0 ? `${monthlyStats.abnormalBS}次异常` : '正常'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">血糖</h3>
            <p className="text-2xl font-bold text-green-500">
              {monthlyStats.avgBloodSugar}
            </p>
            <p className="text-sm text-gray-600">{monthlyStats.bsReadings}次测量</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Moon className="w-5 h-5 text-blue-500" />
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                平均
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">睡眠</h3>
            <p className="text-2xl font-bold text-blue-500">
              {monthlyStats.avgSleepDuration}
            </p>
            <p className="text-sm text-gray-600">小时/质量{monthlyStats.avgSleepQuality}/5</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Pill className="w-5 h-5 text-purple-500" />
              <span className={`text-xs px-2 py-1 rounded-full ${
                monthlyStats.medicationCompliance >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {monthlyStats.medicationCompliance >= 80 ? '良好' : '需改善'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">用药依从性</h3>
            <p className="text-2xl font-bold text-purple-500">
              {monthlyStats.medicationCompliance}%
            </p>
            <p className="text-sm text-gray-600">{monthlyStats.totalMedications}次用药</p>
          </div>
        </div>

        {/* 趋势图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Moon className="w-5 h-5 mr-2 text-blue-500" />
              睡眠质量
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

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Utensils className="w-5 h-5 mr-2 text-orange-500" />
              饮食记录
            </h3>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500 mb-2">
                {monthlyStats.totalMeals}
              </div>
              <div className="text-sm text-gray-600 mb-4">总餐数</div>
              <div className="text-lg font-semibold text-green-500">
                {monthlyStats.healthyMeals} 健康餐
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((monthlyStats.healthyMeals / Math.max(monthlyStats.totalMeals, 1)) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 健康建议 */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">本月健康建议</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">血压管理</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 继续监测血压变化趋势</li>
                <li>• 控制盐分摄入，饮食清淡</li>
                <li>• 保持规律作息和适量运动</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">血糖控制</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 定期监测血糖水平</li>
                <li>• 控制碳水化合物摄入</li>
                <li>• 增加蔬菜和优质蛋白摄入</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}