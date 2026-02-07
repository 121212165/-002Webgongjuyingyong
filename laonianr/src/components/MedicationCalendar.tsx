import React, { useState } from 'react'
import { Calendar, Clock, Pill, CheckCircle, Plus } from 'lucide-react'
import { useHealthStore } from '../stores/healthStore'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { toast } from 'sonner'

interface MedicationCalendarProps {
  onClose: () => void
}

export const MedicationCalendar: React.FC<MedicationCalendarProps> = ({ onClose }) => {
  const { medications, toggleMedication, addMedication } = useHealthStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    time: ''
  })

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const weekStart = startOfWeek(new Date())
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const todayMedications = medications.filter(med => 
    isSameDay(new Date(med.timestamp), selectedDate)
  )

  const handleAddMedication = () => {
    if (!newMedication.name || !newMedication.dosage || !newMedication.time) {
      toast.error('请填写完整的用药信息')
      return
    }

    addMedication({
      name: newMedication.name,
      dosage: newMedication.dosage,
      frequency: newMedication.frequency || '每日一次',
      time: newMedication.time
    })

    toast.success('用药计划已添加')
    setNewMedication({ name: '', dosage: '', frequency: '', time: '' })
    setShowAddForm(false)
  }

  const handleToggleMedication = (id: string) => {
    toggleMedication(id)
    const med = medications.find(m => m.id === id)
    if (med) {
      toast.success(med.taken ? '已标记为未服用' : '已标记为已服用')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-blue-500" />
            用药管理日历
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 本周日期选择 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">选择日期</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => (
              <button
                key={day}
                onClick={() => setSelectedDate(weekDates[index])}
                className={`p-3 rounded-lg text-center transition-colors ${
                  isSameDay(selectedDate, weekDates[index])
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-sm font-medium">{day}</div>
                <div className="text-lg font-bold">
                  {format(weekDates[index], 'd')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 当日用药列表 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-700">
              {format(selectedDate, 'M月d日')} 用药计划
            </h3>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg text-base font-medium hover:bg-green-600 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加用药
            </button>
          </div>

          {todayMedications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Pill className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-base">今日暂无用药计划</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayMedications.map((medication) => (
                <div
                  key={medication.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    medication.taken
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleMedication(medication.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          medication.taken
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {medication.taken && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </button>
                      <div>
                        <h4 className="text-base font-semibold text-gray-800">
                          {medication.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {medication.dosage} - {medication.frequency}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {medication.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 添加用药表单 */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">添加用药计划</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    药品名称
                  </label>
                  <input
                    type="text"
                    value={newMedication.name}
                    onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="请输入药品名称"
                  />
                </div>
                
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    剂量
                  </label>
                  <input
                    type="text"
                    value={newMedication.dosage}
                    onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="如：1片、5ml"
                  />
                </div>
                
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    用药频率
                  </label>
                  <select
                    value={newMedication.frequency}
                    onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="每日一次">每日一次</option>
                    <option value="每日两次">每日两次</option>
                    <option value="每日三次">每日三次</option>
                    <option value="按需服用">按需服用</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    服药时间
                  </label>
                  <input
                    type="time"
                    value={newMedication.time}
                    onChange={(e) => setNewMedication({ ...newMedication, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleAddMedication}
                  className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg text-base font-medium hover:bg-green-600 transition-colors"
                >
                  确认添加
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg text-base font-medium hover:bg-gray-400 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 用药提醒设置 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-base font-semibold text-gray-700 mb-2">用药提醒</h4>
          <p className="text-sm text-gray-600 mb-3">
            系统将在设定时间提醒您按时服药，确保治疗效果
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">开启用药提醒</span>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
              设置提醒
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}