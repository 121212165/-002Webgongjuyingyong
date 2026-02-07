import React, { useState } from 'react'
import { Heart, Droplets, Moon, Plus, Mic } from 'lucide-react'
import { useHealthStore } from '../stores/healthStore'
import { toast } from 'sonner'

interface HealthDataInputProps {
  onClose: () => void
}

export const HealthDataInput: React.FC<HealthDataInputProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'bloodPressure' | 'bloodSugar' | 'sleep'>('bloodPressure')
  const { addBloodPressure, addBloodSugar, addSleepData } = useHealthStore()
  
  const [bpData, setBpData] = useState({ systolic: '', diastolic: '' })
  const [bsData, setBsData] = useState({ value: '', type: 'fasting' as 'fasting' | 'postprandial' })
  const [sleepData, setSleepData] = useState({ duration: '', quality: 3 as 1 | 2 | 3 | 4 | 5 })
  const [isListening, setIsListening] = useState(false)

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('您的浏览器不支持语音识别功能')
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = false

    setIsListening(true)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      
      if (activeTab === 'bloodPressure') {
        const numbers = transcript.match(/\d+/g)
        if (numbers && numbers.length >= 2) {
          setBpData({ systolic: numbers[0], diastolic: numbers[1] })
          toast.success('血压数据识别成功')
        }
      } else if (activeTab === 'bloodSugar') {
        const numbers = transcript.match(/\d+(\.\d+)?/g)
        if (numbers && numbers.length >= 1) {
          setBsData({ ...bsData, value: numbers[0] })
          toast.success('血糖数据识别成功')
        }
      } else if (activeTab === 'sleep') {
        const numbers = transcript.match(/\d+/g)
        if (numbers && numbers.length >= 1) {
          setSleepData({ ...sleepData, duration: numbers[0] })
          toast.success('睡眠时长识别成功')
        }
      }
    }

    recognition.onerror = () => {
      toast.error('语音识别失败，请重试')
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const handleSubmit = () => {
    try {
      if (activeTab === 'bloodPressure' && bpData.systolic && bpData.diastolic) {
        addBloodPressure({
          systolic: parseInt(bpData.systolic),
          diastolic: parseInt(bpData.diastolic)
        })
        toast.success('血压数据已记录')
        setBpData({ systolic: '', diastolic: '' })
      } else if (activeTab === 'bloodSugar' && bsData.value) {
        addBloodSugar({
          value: parseFloat(bsData.value),
          type: bsData.type
        })
        toast.success('血糖数据已记录')
        setBsData({ value: '', type: 'fasting' })
      } else if (activeTab === 'sleep' && sleepData.duration) {
        addSleepData({
          duration: parseInt(sleepData.duration),
          quality: sleepData.quality
        })
        toast.success('睡眠数据已记录')
        setSleepData({ duration: '', quality: 3 })
      }
      onClose()
    } catch (error) {
      toast.error('数据记录失败，请检查输入')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">健康数据记录</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {/* 标签页切换 */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveTab('bloodPressure')}
            className={`flex-1 py-2 px-3 rounded-lg text-base font-medium transition-colors ${
              activeTab === 'bloodPressure'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Heart className="w-4 h-4 inline mr-1" />
            血压
          </button>
          <button
            onClick={() => setActiveTab('bloodSugar')}
            className={`flex-1 py-2 px-3 rounded-lg text-base font-medium transition-colors ${
              activeTab === 'bloodSugar'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Droplets className="w-4 h-4 inline mr-1" />
            血糖
          </button>
          <button
            onClick={() => setActiveTab('sleep')}
            className={`flex-1 py-2 px-3 rounded-lg text-base font-medium transition-colors ${
              activeTab === 'sleep'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Moon className="w-4 h-4 inline mr-1" />
            睡眠
          </button>
        </div>

        {/* 语音输入按钮 */}
        <div className="mb-4">
          <button
            onClick={handleVoiceInput}
            disabled={isListening}
            className={`w-full py-3 px-4 rounded-lg text-base font-medium transition-colors ${
              isListening
                ? 'bg-orange-500 text-white'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            <Mic className="w-4 h-4 inline mr-2" />
            {isListening ? '正在听取...' : '语音输入'}
          </button>
        </div>

        {/* 数据输入表单 */}
        <div className="space-y-4">
          {activeTab === 'bloodPressure' && (
            <>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  收缩压 (mmHg)
                </label>
                <input
                  type="number"
                  value={bpData.systolic}
                  onChange={(e) => setBpData({ ...bpData, systolic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="请输入收缩压"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  舒张压 (mmHg)
                </label>
                <input
                  type="number"
                  value={bpData.diastolic}
                  onChange={(e) => setBpData({ ...bpData, diastolic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="请输入舒张压"
                />
              </div>
            </>
          )}

          {activeTab === 'bloodSugar' && (
            <>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  血糖类型
                </label>
                <select
                  value={bsData.type}
                  onChange={(e) => setBsData({ ...bsData, type: e.target.value as 'fasting' | 'postprandial' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="fasting">空腹血糖</option>
                  <option value="postprandial">餐后血糖</option>
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  血糖值 (mmol/L)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bsData.value}
                  onChange={(e) => setBsData({ ...bsData, value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="请输入血糖值"
                />
              </div>
            </>
          )}

          {activeTab === 'sleep' && (
            <>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  睡眠时长 (小时)
                </label>
                <input
                  type="number"
                  value={sleepData.duration}
                  onChange={(e) => setSleepData({ ...sleepData, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入睡眠时长"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  睡眠质量
                </label>
                <select
                  value={sleepData.quality}
                  onChange={(e) => setSleepData({ ...sleepData, quality: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>很差</option>
                  <option value={2}>较差</option>
                  <option value={3}>一般</option>
                  <option value={4}>良好</option>
                  <option value={5}>优秀</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* 提交按钮 */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg text-base font-medium hover:bg-green-600 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            记录数据
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg text-base font-medium hover:bg-gray-400 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}