/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  getDay,
  parseISO
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Plus, 
  Trash2, 
  Clock, 
  User, 
  Calendar as CalendarIcon,
  Download,
  Printer,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type TimeSlot = string;

interface DutyEntry {
  id: string;
  name: string;
  timeSlot: TimeSlot;
}

interface DailyDuty {
  [dateKey: string]: DutyEntry[];
}

// --- Constants ---

const TIME_SLOTS: TimeSlot[] = ['9:00-17:00', '9:00-13:30', '13:30-17:00'];
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const DEPARTMENTS = ['香灯组', '图书馆', '大寮', '迎宾组', '环艺组', '美术馆'];

// --- Components ---

export default function App() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[0]);
  const [duties, setDuties] = useState<Record<string, DailyDuty>>(() => {
    const saved = localStorage.getItem('museum-duties-v2');
    if (saved) return JSON.parse(saved);
    
    // Migration from v1
    const oldSaved = localStorage.getItem('museum-duties');
    if (oldSaved) {
      return { [DEPARTMENTS[0]]: JSON.parse(oldSaved) };
    }
    return {};
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('museum-duties-v2', JSON.stringify(duties));
  }, [duties]);

  const currentDeptDuties = useMemo(() => duties[selectedDept] || {}, [duties, selectedDept]);

  const stats = useMemo(() => {
    const currentMonthKey = format(currentMonth, 'yyyy-MM');
    const uniqueNames = new Set<string>();
    let fullDay = 0;
    let morning = 0;
    let afternoon = 0;

    (Object.entries(currentDeptDuties) as [string, DutyEntry[]][]).forEach(([dateKey, entries]) => {
      if (dateKey.startsWith(currentMonthKey)) {
        entries.forEach(entry => {
          if (entry.name.trim()) {
            uniqueNames.add(entry.name.trim());
          }
          if (entry.timeSlot === '9:00-17:00') fullDay++;
          else if (entry.timeSlot === '9:00-13:30') morning++;
          else if (entry.timeSlot === '13:30-17:00') afternoon++;
        });
      }
    });

    return { total: uniqueNames.size, fullDay, morning, afternoon };
  }, [currentDeptDuties, currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleDayClick = (day: Date) => {
    if (getDay(day) === 1) return; // Monday is closed
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  const addDuty = (dateKey: string, name: string, timeSlot: TimeSlot) => {
    if (!name.trim()) return;
    const newEntry: DutyEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      timeSlot
    };
    setDuties(prev => {
      const deptDuties = prev[selectedDept] || {};
      return {
        ...prev,
        [selectedDept]: {
          ...deptDuties,
          [dateKey]: [...(deptDuties[dateKey] || []), newEntry]
        }
      };
    });
  };

  const removeDuty = (dateKey: string, id: string) => {
    setDuties(prev => {
      const deptDuties = prev[selectedDept] || {};
      return {
        ...prev,
        [selectedDept]: {
          ...deptDuties,
          [dateKey]: (deptDuties[dateKey] || []).filter(d => d.id !== id)
        }
      };
    });
  };

  const updateDutyTime = (dateKey: string, id: string, newTime?: string) => {
    setDuties(prev => {
      const deptDuties = prev[selectedDept] || {};
      const dayDuties = deptDuties[dateKey] || [];
      const updatedDayDuties = dayDuties.map(d => {
        if (d.id === id) {
          if (newTime !== undefined) {
            return { ...d, timeSlot: newTime };
          }
          const currentIndex = TIME_SLOTS.indexOf(d.timeSlot);
          const nextIndex = (currentIndex + 1) % TIME_SLOTS.length;
          return { ...d, timeSlot: TIME_SLOTS[nextIndex] };
        }
        return d;
      });
      return {
        ...prev,
        [selectedDept]: {
          ...deptDuties,
          [dateKey]: updatedDayDuties
        }
      };
    });
  };

  const printSchedule = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#fdfcf8] selection:bg-[#e6d5b8] selection:text-[#5a4a3a] relative">
      {/* Background Decorative Clouds */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0">
        <div className="absolute top-10 right-10 w-64 h-64 bg-[url('https://www.transparenttextures.com/patterns/cloud-textures.png')]"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-[url('https://www.transparenttextures.com/patterns/cloud-textures.png')] rotate-180"></div>
      </div>

      {/* Header */}
      <header className="py-6 md:py-10 px-4 md:px-6 text-center border-b border-[#e6d5b8] bg-white/50 backdrop-blur-sm sticky top-0 z-20">
        {/* Department Selection Dropdown */}
        <div className="mb-6 md:mb-8 dept-selector max-w-xs mx-auto relative group">
          <div className="relative">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full appearance-none bg-white border border-[#e6d5b8] text-[#5a4a3a] px-6 py-3 rounded-full text-sm md:text-base font-serif tracking-widest cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#c4a484]/20 focus:border-[#c4a484] transition-all shadow-sm pr-12"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#c4a484] group-hover:text-[#5a4a3a] transition-colors">
              <ChevronDown size={20} />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[#8c7e6a] font-serif tracking-widest uppercase opacity-60">切换部门查看排班</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          {/* Logo Placeholder */}
          <div className="mb-4 md:mb-6">
            <img 
              src="/logo.png" 
              alt="星云文教馆" 
              className="h-16 md:h-24 object-contain mix-blend-multiply transition-all hover:scale-105 duration-500"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          <h1 className="text-2xl md:text-5xl font-serif tracking-widest text-[#3d3d3d] mb-2 md:mb-4">
            文教馆{selectedDept}值班管理
          </h1>
          <div className="h-px w-16 md:w-24 bg-[#c4a484] mx-auto mb-4 md:mb-6"></div>
          <p className="text-[#5a4a3a] font-serif tracking-[0.3em] text-sm md:text-lg mb-2">
            说好话 · 做好事 · 存好心
          </p>
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto px-2 md:px-4 py-6 md:py-12">
        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center justify-center mb-6 md:mb-12 gap-4 md:gap-6">
          <div className="flex items-center gap-4 md:gap-8">
            <button 
              onClick={prevMonth}
              className="p-1.5 md:p-2 rounded-full hover:bg-[#f5f0e6] transition-colors text-[#8c7e6a]"
            >
              <ChevronLeft className="w-6 h-6 md:w-7 md:h-7" />
            </button>
            <h2 className="text-xl md:text-3xl font-serif text-[#3d3d3d] min-w-[120px] md:min-w-[180px] text-center">
              {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
            </h2>
            <button 
              onClick={nextMonth}
              className="p-1.5 md:p-2 rounded-full hover:bg-[#f5f0e6] transition-colors text-[#8c7e6a]"
            >
              <ChevronRight className="w-6 h-6 md:w-7 md:h-7" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white border border-[#e6d5b8] rounded-2xl shadow-xl overflow-hidden print:shadow-none print:border-none">
          <div className="w-full">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-[#f0e6d2] bg-[#faf7f0]">
              {WEEKDAYS.map((day, idx) => (
                <div 
                  key={day} 
                  className={`py-3 md:py-4 text-center text-[10px] md:text-sm font-serif tracking-wider ${idx === 1 ? 'text-[#c4a484]' : 'text-[#8c7e6a]'}`}
                >
                  <span className="hidden md:inline">{day}</span>
                  <span className="md:hidden">{day.replace('周', '')}</span>
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                const isMonday = getDay(day) === 1;
                const dayDuties = currentDeptDuties[dateKey] || [];

                return (
                  <div
                    key={dateKey}
                    onClick={() => handleDayClick(day)}
                    className={`
                      min-h-[90px] md:min-h-[140px] p-1 md:p-2 border-r border-b border-[#f0e6d2] transition-all relative group
                      ${!isCurrentMonth ? 'bg-[#fcfbf7] opacity-40' : 'bg-white'}
                      ${isMonday ? 'bg-[#f5f5f5] cursor-not-allowed' : 'cursor-pointer hover:bg-[#fffdf5] active:bg-[#fffdf5] active:scale-[0.98]'}
                      ${idx % 7 === 6 ? 'border-r-0' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start mb-1 md:mb-2">
                      <span className={`
                        text-xs md:text-lg font-serif w-5 h-5 md:w-8 md:h-8 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-[#5a4a3a] text-white' : 'text-[#3d3d3d]'}
                        ${isMonday ? 'opacity-30' : ''}
                      `}>
                        {format(day, 'd')}
                      </span>
                      <div className="flex flex-col items-end gap-1">
                        {isMonday ? (
                          <span className="text-[8px] md:text-[10px] font-serif text-[#c4a484] border border-[#c4a484] px-1 md:px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            闭馆
                          </span>
                        ) : isCurrentMonth && dayDuties.length > 0 && (
                          <span className={`
                            text-[8px] md:text-[10px] font-serif w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center
                            ${dayDuties.length >= 3 ? 'text-green-600 bg-green-50 border border-green-100' : 'text-[#c4a484] bg-[#faf7f0] border border-[#f0e6d2]'}
                          `}>
                            {dayDuties.length}
                          </span>
                        )}
                      </div>
                    </div>

                  <div className="space-y-0.5 md:space-y-1">
                    {dayDuties.map((duty) => (
                      <div 
                        key={duty.id}
                        className="text-[9px] md:text-[11px] bg-[#f9f5eb] border-l border-l-[#c4a484] md:border-l-2 px-1 md:px-2 py-0.5 md:py-1 rounded-sm flex flex-col md:flex-row md:items-center md:justify-between gap-0 md:gap-1"
                      >
                        <span className={`font-medium whitespace-nowrap ${duty.timeSlot === '9:00-17:00' ? 'text-[#5a4a3a]' : 'text-[#757575]'}`}>
                          {duty.name}
                        </span>
                        <span 
                          className="hidden md:inline text-[#8c7e6a] text-[9px] whitespace-nowrap shrink-0 cursor-pointer hover:text-[#5a4a3a] hover:bg-[#e6d5b8]/30 px-1 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateDutyTime(dateKey, duty.id);
                          }}
                          title="点击切换时间段"
                        >
                          {duty.timeSlot}
                        </span>
                      </div>
                    ))}
                    {!isMonday && dayDuties.length === 0 && isCurrentMonth && (
                      <div className="hidden md:group-hover:flex group-active:flex items-center justify-center h-12 border-2 border-dashed border-[#e6d5b8] rounded-lg text-[#c4a484]">
                        <Plus size={16} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '本月值班人数', value: stats.total, unit: '人' },
          { label: '全天值班', value: stats.fullDay, unit: '人次' },
          { label: '早班值班', value: stats.morning, unit: '人次' },
          { label: '晚班值班', value: stats.afternoon, unit: '人次' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-[#e6d5b8] p-4 rounded-xl shadow-sm flex flex-col items-center justify-center">
            <span className="text-[#8c7e6a] text-[10px] md:text-xs font-serif tracking-widest mb-1">{item.label}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl md:text-2xl font-serif text-[#5a4a3a]">{item.value}</span>
              <span className="text-[10px] text-[#c4a484]">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend / Info */}
      <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col gap-2 text-[#8c7e6a] text-sm font-light tracking-wide italic">
          <p>注：每周一为美术馆闭馆日，无需安排值班人员。</p>
          <p>默认值班时间为全天（9:00-17:00）。</p>
        </div>
        
        <button 
          onClick={printSchedule}
          className="flex items-center justify-center gap-2 px-8 py-3 bg-[#5a4a3a] text-white rounded-full hover:bg-[#3d3d3d] transition-all shadow-lg active:scale-95 text-sm tracking-widest font-serif"
        >
          <Printer className="w-5 h-5" />
          <span>打印当前值班表</span>
        </button>
      </div>
    </main>

      {/* Duty Modal */}
      <AnimatePresence>
        {isModalOpen && selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#2c2c2c]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 border border-[#e6d5b8] max-h-[90vh] flex flex-col"
            >
              <div className="bg-[#5a4a3a] p-5 md:p-6 text-white flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-serif">{selectedDept} 值班安排</h3>
                  <p className="text-sm opacity-80 font-light">{format(selectedDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
                {/* Existing Duties */}
                <div className="mb-4">
                  <h4 className="text-xs uppercase tracking-widest text-[#8c7e6a] mb-3 font-semibold">当前人员</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {currentDeptDuties[format(selectedDate, 'yyyy-MM-dd')]?.length ? (
                      currentDeptDuties[format(selectedDate, 'yyyy-MM-dd')].map((duty) => (
                        <div key={duty.id} className="flex items-center justify-between bg-[#fdfcf8] border border-[#f0e6d2] p-2.5 rounded-xl group relative">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 bg-[#f5f0e6] rounded-full flex-shrink-0 flex items-center justify-center text-[#c4a484]">
                              <User size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-[#3d3d3d] text-[11px] leading-tight break-all mb-1">{duty.name}</p>
                              <div className="relative group/input">
                                <input 
                                  type="text"
                                  value={duty.timeSlot}
                                  onChange={(e) => updateDutyTime(format(selectedDate, 'yyyy-MM-dd'), duty.id, e.target.value)}
                                  className="w-full bg-transparent text-[10px] text-[#8c7e6a] border-b border-transparent hover:border-[#e6d5b8] focus:border-[#c4a484] focus:outline-none transition-all py-0.5"
                                  title="点击修改时间数字"
                                />
                                <Clock size={8} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#c4a484] opacity-40 group-hover/input:opacity-100" />
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeDuty(format(selectedDate, 'yyyy-MM-dd'), duty.id)}
                            className="p-1 text-[#c4a484] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2">
                        <p className="text-center py-4 text-[#c4a484] italic text-sm">暂无值班安排</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add New Duty */}
                <div className="border-t border-[#f0e6d2] pt-4">
                  <h4 className="text-xs uppercase tracking-widest text-[#8c7e6a] mb-3 font-semibold">添加人员</h4>
                  <DutyForm 
                    onAdd={(name, slot) => addDuty(format(selectedDate, 'yyyy-MM-dd'), name, slot)} 
                    onCancel={() => setIsModalOpen(false)}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 px-6 text-center text-[#8c7e6a] text-xs font-light tracking-widest uppercase">
        <p>© 2026 星云文教馆值班管理系统</p>
      </footer>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          header, footer, .flex-col.md\\:flex-row.items-center.justify-between, .mt-12, button, .dept-selector {
            display: none !important;
          }
          body::before {
            content: "${selectedDept} 值班表";
            display: block;
            text-align: center;
            font-size: 24px;
            font-family: serif;
            margin-bottom: 10px;
          }
          body {
            background: white !important;
            padding: 0 !important;
          }
          .max-w-7xl {
            max-width: 100% !important;
            padding: 0 !important;
          }
          .bg-white.border {
            border: 1px solid #000 !important;
          }
          .grid-cols-7 > div {
            min-height: 120px !important;
            border-color: #000 !important;
          }
          h2 {
            display: block !important;
            text-align: center;
            margin-bottom: 20px;
          }
        }
      `}} />
    </div>
  );
}

function DutyForm({ onAdd, onCancel }: { onAdd: (name: string, slot: TimeSlot) => void, onCancel: () => void }) {
  const [name, setName] = useState('');
  const [slot, setSlot] = useState<TimeSlot>('9:00-17:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name, slot);
      setName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-[#8c7e6a] mb-1.5 ml-1">姓名</label>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="请输入姓名"
          className="w-full px-4 py-2.5 bg-[#fdfcf8] border border-[#e6d5b8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c4a484]/20 focus:border-[#c4a484] transition-all"
        />
      </div>
      <div>
        <label className="block text-xs text-[#8c7e6a] mb-1.5 ml-1">时间段 (可自行修改数字)</label>
        <input 
          type="text" 
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          placeholder="请输入或选择时间段"
          className="w-full px-4 py-2.5 bg-[#fdfcf8] border border-[#e6d5b8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c4a484]/20 focus:border-[#c4a484] transition-all mb-3"
        />
        <div className="grid grid-cols-1 gap-2">
          {TIME_SLOTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSlot(s)}
              className={`
                px-4 py-2 text-sm rounded-xl border transition-all text-left flex items-center justify-between
                ${slot === s 
                  ? 'bg-[#5a4a3a] border-[#5a4a3a] text-white shadow-md' 
                  : 'bg-white border-[#e6d5b8] text-[#5a4a3a] hover:bg-[#fdfcf8]'}
              `}
            >
              <span>{s}</span>
              {slot === s && <Clock size={14} />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 mt-2">
        <button 
          type="submit"
          disabled={!name.trim()}
          className="flex-1 py-3 bg-[#c4a484] text-white rounded-xl font-serif tracking-widest hover:bg-[#b39373] transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          确认添加
        </button>
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 bg-white border border-[#e6d5b8] text-[#8c7e6a] rounded-xl font-serif tracking-widest hover:bg-[#fdfcf8] transition-all active:scale-[0.98]"
        >
          关闭页面
        </button>
      </div>
    </form>
  );
}
