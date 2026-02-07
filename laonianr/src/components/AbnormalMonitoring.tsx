import React, { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Info, TrendingUp, FileText, Download } from 'lucide-react'
import { useHealthStore } from '../stores/healthStore'
import { format, subDays } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface AbnormalAlert {
  id: string
  type: 'bloodPressure' | 'bloodSugar'
  severity: 'green' | 'yellow' | 'red'
  message: string
  timestamp: Date
  value: number
  recommendation: string
  trend: 'up' | 'down' | 'stable'
}

export const AbnormalMonitoring: React.FC = () => {
  const { bloodPressures, bloodSugars, getAbnormalReadings } = useHealthStore()
  const [alerts, setAlerts] = useState<AbnormalAlert[]>([])
  const [showReport, setShowReport] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<AbnormalAlert | null>(null)

  useEffect(() => {
    checkForAbnormalities()
  }, [bloodPressures, bloodSugars])

  const checkForAbnormalities = () => {
    const abnormalReadings = getAbnormalReadings()
    const newAlerts: AbnormalAlert[] = []

    // 检查连续异常读数
    const recentAbnormal = abnormalReadings.filter(reading => {
      const readingDate = new Date(reading.timestamp)
      const threeDaysAgo = subDays(new Date(), 3)
      return readingDate >= threeDaysAgo
    })

    // 生成预警
    if (recentAbnormal.length >= 3) {
      const latestReading = recentAbnormal[recentAbnormal.length - 1]
      
      if ('systolic' in latestReading) {
        // 血压异常
        const severity = latestReading.systolic > 160 || latestReading.diastolic > 100 ? 'red' : 
                        latestReading.systolic > 140 || latestReading.diastolic > 90 ? 'yellow' : 'green'
        
        newAlerts.push({
          id: Date.now().toString(),
          type: 'bloodPressure',
          severity,
          message: `连续3次血压异常：收缩压${latestReading.systolic}mmHg，舒张压${latestReading.diastolic}mmHg`,
          timestamp: new Date(),
          value: latestReading.systolic,
          recommendation: getBloodPressureRecommendation(severity, latestReading.systolic, latestReading.diastolic),
          trend: getTrend(recentAbnormal as any[])
        })
      } else if ('value' in latestReading) {
        // 血糖异常
        const severity = latestReading.value > 13.9 || latestReading.value < 3.9 ? 'red' :
                        latestReading.value > 11.1 || latestReading.value < 4.4 ? 'yellow' : 'green'
        
        newAlerts.push({
          id: Date.now().toString() + '1',
          type: 'bloodSugar',
          severity,
          message: `连续3次血糖异常：${latestReading.type === 'fasting' ? '空腹' : '餐后'}血糖${latestReading.value}mmol/L`,
          timestamp: new Date(),
          value: latestReading.value,
          recommendation: getBloodSugarRecommendation(severity, latestReading.value, latestReading.type),
          trend: getTrend(recentAbnormal as any[])
        })
      }
    }

    setAlerts(newAlerts)
  }

  const getTrend = (readings: any[]): 'up' | 'down' | 'stable' => {
    if (readings.length < 2) return 'stable'
    const values = readings.map(r => 'systolic' in r ? r.systolic : r.value)
    const first = values[0]
    const last = values[values.length - 1]
    
    if (last > first * 1.1) return 'up'
    if (last < first * 0.9) return 'down'
    return 'stable'
  }

  const getBloodPressureRecommendation = (severity: string, systolic: number, diastolic: number): string => {
    switch (severity) {
      case 'red':
        return '建议立即就医，血压过高可能存在危险。同时减少盐分摄入，保持情绪稳定。'
      case 'yellow':
        return '建议调整生活方式：减少盐分摄入、适量运动、保持充足睡眠。如持续异常请咨询医生。'
      default:
        return '继续观察，保持健康的生活方式，定期监测血压变化。'
    }
  }

  const getBloodSugarRecommendation = (severity: string, value: number, type: 'fasting' | 'postprandial'): string => {
    switch (severity) {
      case 'red':
        return type === 'fasting' && value > 13.9 ? '建议立即就医，血糖过高需要专业治疗。控制饮食，避免高糖食物。' :
               type === 'fasting' && value < 3.9 ? '血糖过低，建议立即补充糖分，如糖果、果汁。如症状严重请就医。' :
               '血糖异常，建议立即就医或咨询医生调整用药方案。'
      case 'yellow':
        return '建议调整饮食：控制碳水化合物摄入，增加蔬菜和蛋白质，适量运动。如持续异常请咨询医生。'
      default:
        return '继续观察，保持均衡饮食，定期监测血糖变化。'
    }
  }

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'red':
        return <AlertTriangle className="w-6 h-6 text-red-500" />
      case 'yellow':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />
      default:
        return <Info className="w-6 h-6 text-green-500" />
    }
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'red':
        return 'border-red-200 bg-red-50'
      case 'yellow':
        return 'border-yellow-200 bg-yellow-50'
      default:
        return 'border-green-200 bg-green-50'
    }
  }

  const generateHealthReport = () => {
    const reportData = {
      alerts,
      bloodPressureData: getChartData(bloodPressures, 'systolic', 'diastolic'),
      bloodSugarData: getChartData(bloodSugars, 'value'),
      generatedAt: new Date()
    }

    return reportData
  }

  const getChartData = (data: any[], ...fields: string[]) => {
    return data.slice(-7).map((item, index) => ({
      date: format(new Date(item.timestamp), 'MM/dd'),
      ...fields.reduce((acc, field) => ({ ...acc, [field]: item[field] }), {})
    }))
  }

  const exportReport = () => {
    const report = generateHealthReport()
    const reportText = `
健康异常监测报告
生成时间：${format(report.generatedAt, 'yyyy年MM月dd日 HH:mm')}

异常预警：
${report.alerts.map(alert => `
${alert.type === 'bloodPressure' ? '血压' : '血糖'}异常
严重程度：${alert.severity === 'red' ? '高' : alert.severity === 'yellow' ? '中' : '低'}
${alert.message}
建议：${alert.recommendation}
`).join('\n')}

建议措施：
1. 密切监测相关指标变化
2. 按医嘱调整用药方案
3. 改善生活方式和饮食习惯
4. 如有不适及时就医
    `

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `健康异常报告_${format(new Date(), 'yyyyMMdd')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <div className="flex items-center">
          <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-green-800">健康状况良好</h3>
            <p className="text-green-700">近期未发现异常指标，请继续保持健康的生活方式</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 异常预警列表 */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <AlertTriangle className="w-6 h-6 mr-2 text-orange-500" />
          健康异常预警
        </h3>
        
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`border-2 rounded-lg p-4 ${getAlertColor(alert.severity)}`}
          >
            <div className="flex items-start space-x-3">
              {getAlertIcon(alert.severity)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold text-gray-800">
                    {alert.type === 'bloodPressure' ? '血压异常' : '血糖异常'}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alert.severity === 'red' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {alert.severity === 'red' ? '高风险' : alert.severity === 'yellow' ? '中风险' : '低风险'}
                    </span>
                    <TrendingUp className={`w-4 h-4 ${
                      alert.trend === 'up' ? 'text-red-500' :
                      alert.trend === 'down' ? 'text-green-500' :
                      'text-gray-500'
                    }`} />
                  </div>
                </div>
                <p className="text-gray-700 mb-3">{alert.message}</p>
                <div className="bg-white rounded-lg p-3 mb-3">
                  <h5 className="font-medium text-gray-800 mb-2">建议措施：</h5>
                  <p className="text-sm text-gray-600">{alert.recommendation}</p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    检测时间：{format(alert.timestamp, 'MM月dd日 HH:mm')}
                  </span>
                  <button
                    onClick={() => setSelectedAlert(alert)}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    查看详情
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 生成报告按钮 */}
      <div className="flex space-x-3">
        <button
          onClick={() => setShowReport(true)}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-blue-600 transition-colors flex items-center"
        >
          <FileText className="w-5 h-5 mr-2" />
          生成详细报告
        </button>
        <button
          onClick={exportReport}
          className="bg-green-500 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-green-600 transition-colors flex items-center"
        >
          <Download className="w-5 h-5 mr-2" />
          导出报告
        </button>
      </div>

      {/* 详细报告模态框 */}
      {showReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                健康异常详细报告
              </h2>
              <button
                onClick={() => setShowReport(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* 趋势图表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">血压趋势</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={getChartData(bloodPressures, 'systolic', 'diastolic')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">血糖趋势</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={getChartData(bloodSugars, 'value')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 异常统计 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">异常统计</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{alerts.filter(a => a.severity === 'red').length}</div>
                  <div className="text-sm text-gray-600">高风险</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">{alerts.filter(a => a.severity === 'yellow').length}</div>
                  <div className="text-sm text-gray-600">中风险</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{alerts.filter(a => a.severity === 'green').length}</div>
                  <div className="text-sm text-gray-600">低风险</div>
                </div>
              </div>
            </div>

            {/* 健康建议 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">综合健康建议</h3>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>• 建议每天定时测量血压和血糖，记录变化趋势</li>
                <li>• 保持规律作息，避免熬夜和过度劳累</li>
                <li>• 饮食清淡，控制盐分和糖分摄入</li>
                <li>• 适量运动，如散步、太极等温和运动</li>
                <li>• 按时服药，不要随意更改用药方案</li>
                <li>• 定期体检，及时与医生沟通健康状况</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}