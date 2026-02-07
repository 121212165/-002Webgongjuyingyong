import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface BloodPressure {
  id: string
  systolic: number
  diastolic: number
  timestamp: Date
  isAbnormal: boolean
}

export interface BloodSugar {
  id: string
  value: number
  type: 'fasting' | 'postprandial'
  timestamp: Date
  isAbnormal: boolean
}

export interface SleepData {
  id: string
  duration: number
  quality: 1 | 2 | 3 | 4 | 5
  timestamp: Date
}

export interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  time: string
  taken: boolean
  timestamp: Date
}

export interface Meal {
  id: string
  type: 'breakfast' | 'lunch' | 'dinner'
  foods: string[]
  tags: string[]
  timestamp: Date
}

interface HealthState {
  bloodPressures: BloodPressure[]
  bloodSugars: BloodSugar[]
  sleepData: SleepData[]
  medications: Medication[]
  meals: Meal[]
  abnormalReadings: any[]
  
  addBloodPressure: (data: Omit<BloodPressure, 'id' | 'isAbnormal'>) => void
  addBloodSugar: (data: Omit<BloodSugar, 'id' | 'isAbnormal'>) => void
  addSleepData: (data: Omit<SleepData, 'id'>) => void
  addMedication: (data: Omit<Medication, 'id' | 'taken'>) => void
  toggleMedication: (id: string) => void
  addMeal: (data: Omit<Meal, 'id'>) => void
  getAbnormalReadings: () => any[]
  checkForAbnormalities: () => void
}

const checkBloodPressureAbnormal = (systolic: number, diastolic: number): boolean => {
  return systolic > 140 || diastolic > 90 || systolic < 90 || diastolic < 60
}

const checkBloodSugarAbnormal = (value: number, type: 'fasting' | 'postprandial'): boolean => {
  if (type === 'fasting') {
    return value > 7.0 || value < 3.9
  } else {
    return value > 11.1 || value < 3.9
  }
}

export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
      bloodPressures: [],
      bloodSugars: [],
      sleepData: [],
      medications: [],
      meals: [],
      abnormalReadings: [],

      addBloodPressure: (data) => {
        const isAbnormal = checkBloodPressureAbnormal(data.systolic, data.diastolic)
        const newReading: BloodPressure = {
          ...data,
          id: Date.now().toString(),
          isAbnormal,
          timestamp: new Date()
        }
        set((state) => ({
          bloodPressures: [...state.bloodPressures, newReading]
        }))
        get().checkForAbnormalities()
      },

      addBloodSugar: (data) => {
        const isAbnormal = checkBloodSugarAbnormal(data.value, data.type)
        const newReading: BloodSugar = {
          ...data,
          id: Date.now().toString(),
          isAbnormal,
          timestamp: new Date()
        }
        set((state) => ({
          bloodSugars: [...state.bloodSugars, newReading]
        }))
        get().checkForAbnormalities()
      },

      addSleepData: (data) => {
        const newSleep: SleepData = {
          ...data,
          id: Date.now().toString(),
          timestamp: new Date()
        }
        set((state) => ({
          sleepData: [...state.sleepData, newSleep]
        }))
      },

      addMedication: (data) => {
        const newMedication: Medication = {
          ...data,
          id: Date.now().toString(),
          taken: false,
          timestamp: new Date()
        }
        set((state) => ({
          medications: [...state.medications, newMedication]
        }))
      },

      toggleMedication: (id) => {
        set((state) => ({
          medications: state.medications.map((med) =>
            med.id === id ? { ...med, taken: !med.taken } : med
          )
        }))
      },

      addMeal: (data) => {
        const newMeal: Meal = {
          ...data,
          id: Date.now().toString(),
          timestamp: new Date()
        }
        set((state) => ({
          meals: [...state.meals, newMeal]
        }))
      },

      getAbnormalReadings: () => {
        const state = get()
        const abnormalBP = state.bloodPressures.filter(bp => bp.isAbnormal)
        const abnormalBS = state.bloodSugars.filter(bs => bs.isAbnormal)
        return [...abnormalBP, ...abnormalBS]
      },

      checkForAbnormalities: () => {
        const state = get()
        const abnormalReadings = get().getAbnormalReadings()
        
        // 检查连续异常读数
        const recentAbnormal = abnormalReadings.filter(reading => {
          const readingDate = new Date(reading.timestamp)
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          return readingDate >= threeDaysAgo
        })

        if (recentAbnormal.length >= 3) {
          // 触发异常预警
          console.warn('连续异常读数检测:', recentAbnormal)
        }

        set({ abnormalReadings: recentAbnormal })
      }
    }),
    {
      name: 'health-storage'
    }
  )
)