import React, { useState } from 'react'
import { Utensils, Plus, Tag, Save, X } from 'lucide-react'
import { useHealthStore } from '../stores/healthStore'
import { toast } from 'sonner'

interface FoodDiaryProps {
  onClose: () => void
}

const healthyFoodTags = [
  '低盐', '低糖', '低脂', '高纤维', '高蛋白', '富含维生素',
  '富含矿物质', '易消化', '清淡', '蒸煮', '汤类', '蔬菜',
  '水果', '全谷物', '鱼类', '豆制品', '坚果'
]

export const FoodDiary: React.FC<FoodDiaryProps> = ({ onClose }) => {
  const { addMeal } = useHealthStore()
  const [activeMeal, setActiveMeal] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast')
  const [foods, setFoods] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const mealNames = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐'
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleSaveMeal = () => {
    if (!foods.trim()) {
      toast.error('请填写食物内容')
      return
    }

    const foodList = foods.split(/[,，]/).map(food => food.trim()).filter(Boolean)
    
    addMeal({
      type: activeMeal,
      foods: foodList,
      tags: selectedTags
    })

    toast.success(`${mealNames[activeMeal]}已记录`)
    
    // 重置表单
    setFoods('')
    setSelectedTags([])
    
    // 自动切换到下一餐
    if (activeMeal === 'breakfast') {
      setActiveMeal('lunch')
    } else if (activeMeal === 'lunch') {
      setActiveMeal('dinner')
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Utensils className="w-6 h-6 mr-2 text-orange-500" />
            饮食日记
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 餐次选择 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">选择餐次</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(mealNames).map(([key, name]) => (
              <button
                key={key}
                onClick={() => setActiveMeal(key as 'breakfast' | 'lunch' | 'dinner')}
                className={`p-4 rounded-lg text-center transition-colors ${
                  activeMeal === key
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-lg font-bold">{name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 食物输入 */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-gray-700 mb-3">
            {mealNames[activeMeal]}食物内容
          </label>
          <textarea
            value={foods}
            onChange={(e) => setFoods(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            rows={4}
            placeholder={`请输入${mealNames[activeMeal]}食物内容，多个食物用逗号分隔\n例如：米饭, 青菜, 鸡蛋, 牛奶`}
          />
        </div>

        {/* 健康标签选择 */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-gray-700 mb-3 flex items-center">
            <Tag className="w-5 h-5 mr-2" />
            健康标签
          </label>
          <div className="grid grid-cols-4 gap-2">
            {healthyFoodTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 已选标签显示 */}
        {selectedTags.length > 0 && (
          <div className="mb-6">
            <h4 className="text-base font-medium text-gray-700 mb-2">已选择的健康标签：</h4>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 营养建议 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h4 className="text-base font-semibold text-blue-800 mb-2">营养建议</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 建议每餐包含蛋白质、蔬菜和主食</li>
            <li>• 老年人宜选择易消化、营养丰富的食物</li>
            <li>• 控制盐分摄入，每日不超过6克</li>
            <li>• 多吃新鲜蔬菜水果，补充维生素和纤维</li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-3">
          <button
            onClick={handleSaveMeal}
            className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg text-base font-medium hover:bg-green-600 transition-colors flex items-center justify-center"
          >
            <Save className="w-4 h-4 mr-2" />
            保存记录
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg text-base font-medium hover:bg-gray-400 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4 mr-2" />
            取消
          </button>
        </div>
      </div>
    </div>
  )
}