import React, { useState } from 'react'
import { Heart, Pill, Utensils, BarChart3, FileText, Plus, Settings, User } from 'lucide-react'
import { Toaster } from 'sonner'
import { HealthDataInput } from './components/HealthDataInput'
import { MedicationCalendar } from './components/MedicationCalendar'
import { FoodDiary } from './components/FoodDiary'
import { HealthDashboard } from './components/HealthDashboard'
import { MonthlyReport } from './components/MonthlyReport'
import { AbnormalMonitoring } from './components/AbnormalMonitoring'
import { useHealthStore } from './stores/healthStore'

function App() {
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const { abnormalReadings } = useHealthStore()

  const menuItems = [
    {
      id: 'healthData',
      title: '健康数据',
      description: '记录血压、血糖、睡眠数据',
      icon: Heart,
      color: 'bg-red-500',
      modal: 'healthData'
    },
    {
      id: 'medication',
      title: '用药管理',
      description: '管理用药计划和提醒',
      icon: Pill,
      color: 'bg-green-500',
      modal: 'medication'
    },
    {
      id: 'food',
      title: '饮食日记',
      description: '记录每日饮食情况',
      icon: Utensils,
      color: 'bg-orange-500',
      modal: 'food'
    },
    {
      id: 'dashboard',
      title: '数据仪表盘',
      description: '查看健康数据趋势',
      icon: BarChart3,
      color: 'bg-blue-500',
      modal: 'dashboard'
    },
    {
      id: 'report',
      title: '月度报告',
      description: '生成健康总结报告',
      icon: FileText,
      color: 'bg-purple-500',
      modal: 'report'
    }
  ]

  const handleMenuClick = (modal: string) => {
    setActiveModal(modal)
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Toaster position="top-center" richColors />
      
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">健康管家</h1>
                <p className="text-sm text-gray-600">老年人健康管理系统</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 异常预警提醒 */}
      {abnormalReadings.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">{abnormalReadings.length}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800">健康异常提醒</h3>
                <p className="text-red-700 text-sm">检测到{abnormalReadings.length}个异常读数，请及时关注</p>
              </div>
              <button 
                onClick={() => setActiveModal('abnormal')}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                查看详情
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主要内容 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 功能菜单 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.modal)}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-center space-x-4">
                  <div className={`${item.color} rounded-lg p-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <Plus className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </button>
            )
          })}
        </div>

        {/* 异常监测面板 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            健康监测
          </h2>
          <AbnormalMonitoring />
        </div>

        {/* 快速数据仪表盘 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            数据概览
          </h2>
          <HealthDashboard />
        </div>
      </main>

      {/* 模态框 */}
      {activeModal === 'healthData' && <HealthDataInput onClose={closeModal} />}
      {activeModal === 'medication' && <MedicationCalendar onClose={closeModal} />}
      {activeModal === 'food' && <FoodDiary onClose={closeModal} />}
      {activeModal === 'dashboard' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">详细数据仪表盘</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <HealthDashboard />
          </div>
        </div>
      )}
      {activeModal === 'report' && <MonthlyReport onClose={closeModal} />}
      {activeModal === 'abnormal' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">异常监测详情</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <AbnormalMonitoring />
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-around">
            {menuItems.slice(0, 4).map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.modal)}
                  className="flex flex-col items-center space-y-1 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Icon className="w-5 h-5 text-gray-600" />
                  <span className="text-xs text-gray-600">{item.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}

export default App
