import React, { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, onValue, set } from 'firebase/database';

export default function FamilyHQ() {
  const getTodayIndex = () => {
    const today = new Date();
    const day = today.getDay();
    return day === 0 ? 6 : day - 1;
  };

  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(formatDateLocal(new Date()));
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('event');
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingChore, setEditingChore] = useState(null);
  const [editSeriesMode, setEditSeriesMode] = useState(null);
  const [calendarView, setCalendarView] = useState('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const locations = ['Little Palace', 'Cronulla Pre-School', 'No Daycare'];
  const people = ['Chris', 'Alex', 'Both'];
  const caregiverOptions = ['Chris', 'Alex', 'Both', 'Other'];
  
  const eventCategories = [
    { id: 'kids', label: 'Kids', color: '#14b8a6', icon: '👶', gradient: 'from-teal-400 to-cyan-500' },
    { id: 'appointments', label: 'Appts', color: '#f43f5e', icon: '🏥', gradient: 'from-rose-400 to-red-500' },
    { id: 'work', label: 'Work', color: '#a855f7', icon: '💼', gradient: 'from-purple-400 to-fuchsia-500' },
    { id: 'family', label: 'Family', color: '#f59e0b', icon: '👨‍👩‍👧‍👦', gradient: 'from-amber-400 to-orange-500' },
    { id: 'other', label: 'Other', color: '#6b7280', icon: '📌', gradient: 'from-gray-400 to-slate-500' },
  ];
  
  const recurrenceOptions = [
    { id: 'none', label: 'Does not repeat' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'fortnightly', label: 'Fortnightly' },
    { id: 'monthly', label: 'Monthly' },
  ];

  function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const getDayIndexFromDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
  };

  const getTodayStr = () => formatDateLocal(new Date());

  const getWeekStart = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.getFullYear(), date.getMonth(), diff);
    return formatDateLocal(monday);
  };

  const getWeekDates = (startDateStr) => {
    const monday = new Date(getWeekStart(startDateStr) + 'T00:00:00');
    return Array(7).fill(null).map((_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return formatDateLocal(d);
    });
  };

  const weekDates = getWeekDates(selectedDate);
  const selectedDayIndex = getDayIndexFromDate(selectedDate);

  const goToPreviousWeek = () => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() - 7);
    setSelectedDate(formatDateLocal(current));
  };

  const goToNextWeek = () => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + 7);
    setSelectedDate(formatDateLocal(current));
  };

  const goToToday = () => {
    setSelectedDate(getTodayStr());
  };

  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! ☀️';
    if (hour < 17) return 'Good afternoon! 🌤️';
    return 'Good evening! 🌙';
  };

  // Weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const lat = -34.0587;
        const lon = 151.1515;
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Australia%2FSydney&forecast_days=3`
        );
        const data = await response.json();
        setWeather(data);
        setWeatherLoading(false);
      } catch (error) {
        console.error('Weather fetch error:', error);
        setWeatherLoading(false);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherInfo = (code) => {
    const weatherCodes = {
      0: { icon: '☀️', desc: 'Clear' },
      1: { icon: '🌤️', desc: 'Mostly Clear' },
      2: { icon: '⛅', desc: 'Partly Cloudy' },
      3: { icon: '☁️', desc: 'Cloudy' },
      45: { icon: '🌫️', desc: 'Foggy' },
      48: { icon: '🌫️', desc: 'Foggy' },
      51: { icon: '🌦️', desc: 'Light Drizzle' },
      53: { icon: '🌦️', desc: 'Drizzle' },
      55: { icon: '🌧️', desc: 'Heavy Drizzle' },
      61: { icon: '🌧️', desc: 'Light Rain' },
      63: { icon: '🌧️', desc: 'Rain' },
      65: { icon: '🌧️', desc: 'Heavy Rain' },
      80: { icon: '🌦️', desc: 'Showers' },
      81: { icon: '🌧️', desc: 'Showers' },
      82: { icon: '⛈️', desc: 'Heavy Showers' },
      95: { icon: '⛈️', desc: 'Thunderstorm' },
    };
    return weatherCodes[code] || { icon: '🌡️', desc: 'Unknown' };
  };

  const defaultData = {
    calendarEvents: [],
    eventExceptions: [],
    kids: {
      camilla: Array(7).fill(null).map((_, i) => ({ day: i, location: i < 5 ? 'Little Palace' : 'No Daycare', dropoff: 'Chris', pickup: 'Alex', caregiver: 'Chris', caregiverOther: '' })),
      asher: Array(7).fill(null).map((_, i) => ({ day: i, location: i < 5 ? 'Little Palace' : 'No Daycare', dropoff: 'Alex', pickup: 'Chris', caregiver: 'Alex', caregiverOther: '' }))
    },
    meals: [],
    chores: [],
    choreCompletions: [],
    grocery: []
  };

  const [weekData, setWeekData] = useState(defaultData);
  const [newItem, setNewItem] = useState({ 
    title: '', time: '09:00', person: 'Chris', personOther: '', kid: 'Camilla', 
    day: 0, meal: '', prep: 'Chris', task: '', item: '', 
    date: formatDateLocal(new Date()), category: 'kids', recurrence: 'none', allDay: false,
    choreDays: []
  });

  // Firebase sync
  useEffect(() => {
    const dataRef = ref(database, 'familyData');
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const processKidData = (kidData, defaults) => {
          if (!kidData) return defaults;
          return kidData.map((d, i) => ({
            ...defaults[i],
            ...d,
            caregiver: d.caregiver || 'Chris',
            caregiverOther: d.caregiverOther || ''
          }));
        };
        
        setWeekData({ 
          ...defaultData, 
          ...data,
          eventExceptions: data.eventExceptions || [],
          choreCompletions: data.choreCompletions || [],
          kids: { 
            camilla: processKidData(data.kids?.camilla, defaultData.kids.camilla),
            asher: processKidData(data.kids?.asher, defaultData.kids.asher)
          }
        });
      }
      setIsLoading(false);
    }, () => setIsLoading(false));
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { unsubscribe(); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const saveToFirebase = (newData) => set(ref(database, 'familyData'), newData).catch(console.error);

  const eventOccursOnDate = (event, targetDateStr) => {
    const eventDate = new Date(event.date + 'T00:00:00');
    const targetDate = new Date(targetDateStr + 'T00:00:00');
    if (targetDate < eventDate) return false;
    const exception = (weekData.eventExceptions || []).find(
      ex => ex.eventId === event.id && ex.date === targetDateStr && ex.deleted
    );
    if (exception) return false;
    const daysDiff = Math.floor((targetDate - eventDate) / (1000 * 60 * 60 * 24));
    if (event.recurrence === 'none') return daysDiff === 0;
    if (event.recurrence === 'weekly') return daysDiff % 7 === 0;
    if (event.recurrence === 'fortnightly') return daysDiff % 14 === 0;
    if (event.recurrence === 'monthly') return eventDate.getDate() === targetDate.getDate();
    return daysDiff === 0;
  };

  const getEventForDate = (event, dateStr) => {
    const exception = (weekData.eventExceptions || []).find(
      ex => ex.eventId === event.id && ex.date === dateStr && !ex.deleted
    );
    if (exception) {
      return { ...event, ...exception.changes, isException: true, exceptionDate: dateStr };
    }
    return event;
  };

  const choreOccursOnDate = (chore, targetDateStr) => {
    const targetDayIndex = getDayIndexFromDate(targetDateStr);
    if (chore.repeatDays && Array.isArray(chore.repeatDays) && chore.repeatDays.length > 0) {
      if (chore.startDate) {
        const startDate = new Date(chore.startDate + 'T00:00:00');
        const targetDate = new Date(targetDateStr + 'T00:00:00');
        if (targetDate < startDate) return false;
      }
      return chore.repeatDays.includes(targetDayIndex);
    }
    return chore.date === targetDateStr;
  };

  const isChoreCompletedForDate = (choreId, dateStr) => {
    return (weekData.choreCompletions || []).some(
      c => c.choreId === choreId && c.date === dateStr
    );
  };

  const toggleChoreForDate = (choreId, dateStr) => {
    const isCompleted = isChoreCompletedForDate(choreId, dateStr);
    let newCompletions;
    if (isCompleted) {
      newCompletions = (weekData.choreCompletions || []).filter(
        c => !(c.choreId === choreId && c.date === dateStr)
      );
    } else {
      newCompletions = [...(weekData.choreCompletions || []), { choreId, date: dateStr }];
    }
    const newData = { ...weekData, choreCompletions: newCompletions };
    setWeekData(newData);
    saveToFirebase(newData);
  };

  const getChoreRepeatLabel = (chore) => {
    if (!chore.repeatDays || chore.repeatDays.length === 0) return null;
    if (chore.repeatDays.length === 7) return 'Daily';
    if (chore.repeatDays.length === 5 && 
        chore.repeatDays.includes(0) && chore.repeatDays.includes(1) && 
        chore.repeatDays.includes(2) && chore.repeatDays.includes(3) && 
        chore.repeatDays.includes(4)) return 'Weekdays';
    if (chore.repeatDays.length === 2 && 
        chore.repeatDays.includes(5) && chore.repeatDays.includes(6)) return 'Weekends';
    return chore.repeatDays.sort((a, b) => a - b).map(d => shortDays[d].charAt(0)).join(', ');
  };

  const getEventsForDate = (dateStr) => {
    const events = (weekData.calendarEvents || [])
      .filter(e => eventOccursOnDate(e, dateStr))
      .map(e => getEventForDate(e, dateStr));
    return events.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.time || '').localeCompare(b.time || '');
    });
  };

  const getChoresForDate = (dateStr) => {
    return (weekData.chores || []).filter(c => choreOccursOnDate(c, dateStr));
  };

  const getMealForDate = (dateStr) => {
    return (weekData.meals || []).find(m => m.date === dateStr);
  };

  const getChoreStats = (dateStr) => {
    const chores = getChoresForDate(dateStr);
    const completed = chores.filter(c => isChoreCompletedForDate(c.id, dateStr)).length;
    return { total: chores.length, completed };
  };

  const formatTime = (t) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; };
  const getCategoryInfo = (id) => eventCategories.find(c => c.id === id) || eventCategories[4];

  const updateKidDay = (kid, day, field, value) => { 
    const newData = { 
      ...weekData, 
      kids: { 
        ...weekData.kids, 
        [kid]: weekData.kids[kid].map((d, i) => i === day ? { ...d, [field]: value } : d) 
      } 
    }; 
    setWeekData(newData); 
    saveToFirebase(newData); 
  };

  const toggleGrocery = (id) => { 
    const newData = { ...weekData, grocery: weekData.grocery.map(g => g.id === id ? { ...g, done: !g.done } : g) }; 
    setWeekData(newData); 
    saveToFirebase(newData); 
  };

  const deleteEvent = (id, dateStr = null, deleteType = 'all') => {
    let newData = { ...weekData };
    if (deleteType === 'single' && dateStr) {
      newData.eventExceptions = [
        ...(weekData.eventExceptions || []),
        { eventId: id, date: dateStr, deleted: true }
      ];
    } else {
      newData.calendarEvents = weekData.calendarEvents.filter(e => e.id !== id);
      newData.eventExceptions = (weekData.eventExceptions || []).filter(ex => ex.eventId !== id);
    }
    setWeekData(newData);
    saveToFirebase(newData);
  };

  const deleteChore = (id) => { 
    const newData = { 
      ...weekData, 
      chores: weekData.chores.filter(c => c.id !== id),
      choreCompletions: (weekData.choreCompletions || []).filter(c => c.choreId !== id)
    }; 
    setWeekData(newData); 
    saveToFirebase(newData); 
  };

  const deleteMeal = (id) => {
    const newData = { ...weekData, meals: weekData.meals.filter(m => m.id !== id) };
    setWeekData(newData);
    saveToFirebase(newData);
  };

  const deleteGroceryItem = (id) => { 
    const newData = { ...weekData, grocery: weekData.grocery.filter(g => g.id !== id) }; 
    setWeekData(newData); 
    saveToFirebase(newData); 
  };

  const openModal = (type, presetDate = null) => { 
    setModalType(type);
    setEditingEvent(null);
    setEditingChore(null);
    setEditSeriesMode(null);
    const dateStr = presetDate || selectedDate;
    setNewItem({ 
      title: '', time: '09:00', person: 'Chris', personOther: '', kid: 'Camilla', 
      day: getDayIndexFromDate(dateStr), meal: '', prep: 'Chris', task: '', item: '', 
      date: dateStr, category: 'kids', recurrence: 'none', allDay: false,
      choreDays: []
    }); 
    setShowAddModal(true); 
  };

  const openEditModal = (event, dateStr) => {
    const isRecurring = event.recurrence && event.recurrence !== 'none';
    if (isRecurring && !event.isException) {
      setEditingEvent({ ...event, editDate: dateStr });
      setEditSeriesMode('choosing');
      setShowAddModal(true);
      setModalType('event');
    } else {
      proceedWithEventEdit(event, dateStr, event.isException ? 'single' : 'all');
    }
  };

  const proceedWithEventEdit = (event, dateStr, mode) => {
    setModalType('event');
    setEditingEvent({ ...event, editDate: dateStr });
    setEditSeriesMode(mode);
    const isOtherPerson = !people.includes(event.person);
    setNewItem({
      title: event.title,
      time: event.time || '09:00',
      person: isOtherPerson ? 'Other' : event.person,
      personOther: isOtherPerson ? event.person : '',
      kid: event.kid,
      day: getDayIndexFromDate(dateStr),
      meal: '',
      prep: 'Chris',
      task: '',
      item: '',
      date: mode === 'single' ? dateStr : event.date,
      category: event.category,
      recurrence: mode === 'single' ? 'none' : event.recurrence,
      allDay: event.allDay || false,
      choreDays: []
    });
  };

  const openEditChoreModal = (chore) => {
    setModalType('chore');
    setEditingChore(chore);
    setEditingEvent(null);
    setEditSeriesMode(null);
    const isOtherPerson = !people.includes(chore.person);
    setNewItem({
      title: '',
      time: '09:00',
      person: isOtherPerson ? 'Other' : chore.person,
      personOther: isOtherPerson ? chore.person : '',
      kid: 'Camilla',
      day: getDayIndexFromDate(chore.date || chore.startDate || selectedDate),
      meal: '',
      prep: 'Chris',
      task: chore.task,
      item: '',
      date: chore.date || chore.startDate || selectedDate,
      category: 'kids',
      recurrence: 'none',
      allDay: false,
      choreDays: chore.repeatDays || []
    });
    setShowAddModal(true);
  };

  const toggleChoreDay = (dayIndex) => {
    setNewItem(prev => {
      const currentDays = prev.choreDays || [];
      if (currentDays.includes(dayIndex)) {
        return { ...prev, choreDays: currentDays.filter(d => d !== dayIndex) };
      } else {
        return { ...prev, choreDays: [...currentDays, dayIndex].sort((a, b) => a - b) };
      }
    });
  };

  const addItem = () => {
    const finalPerson = newItem.person === 'Other' ? newItem.personOther : newItem.person;
    let newData = { ...weekData };
    
    if (modalType === 'event' && newItem.title) {
      if (editingEvent) {
        if (editSeriesMode === 'single') {
          const existingExceptionIndex = (weekData.eventExceptions || []).findIndex(
            ex => ex.eventId === editingEvent.id && ex.date === editingEvent.editDate
          );
          const exceptionData = {
            eventId: editingEvent.id,
            date: editingEvent.editDate,
            changes: {
              title: newItem.title,
              time: newItem.allDay ? null : newItem.time,
              person: finalPerson,
              kid: newItem.kid,
              category: newItem.category,
              allDay: newItem.allDay
            }
          };
          if (existingExceptionIndex >= 0) {
            newData.eventExceptions = [...weekData.eventExceptions];
            newData.eventExceptions[existingExceptionIndex] = exceptionData;
          } else {
            newData.eventExceptions = [...(weekData.eventExceptions || []), exceptionData];
          }
        } else {
          newData.calendarEvents = weekData.calendarEvents.map(e => 
            e.id === editingEvent.id 
              ? { ...e, date: newItem.date, time: newItem.allDay ? null : newItem.time, title: newItem.title, person: finalPerson, kid: newItem.kid, category: newItem.category, recurrence: newItem.recurrence, allDay: newItem.allDay }
              : e
          );
        }
      } else {
        const id = Date.now();
        newData.calendarEvents = [...(weekData.calendarEvents || []), { 
          id, date: newItem.date, time: newItem.allDay ? null : newItem.time, 
          title: newItem.title, person: finalPerson, kid: newItem.kid, 
          category: newItem.category, recurrence: newItem.recurrence, allDay: newItem.allDay 
        }];
      }
    } else if (modalType === 'meal' && newItem.meal) {
      const id = Date.now();
      newData.meals = [
        ...(weekData.meals || []).filter(m => m.date !== newItem.date),
        { id, date: newItem.date, meal: newItem.meal, prep: newItem.prep }
      ];
    } else if (modalType === 'chore' && newItem.task) {
      if (editingChore) {
        newData.chores = weekData.chores.map(c => 
          c.id === editingChore.id 
            ? { 
                ...c, task: newItem.task, person: finalPerson,
                date: newItem.choreDays.length > 0 ? null : newItem.date,
                startDate: newItem.choreDays.length > 0 ? newItem.date : null,
                repeatDays: newItem.choreDays.length > 0 ? newItem.choreDays : null 
              }
            : c
        );
      } else {
        const id = Date.now();
        newData.chores = [...(weekData.chores || []), { 
          id, task: newItem.task, person: finalPerson,
          date: newItem.choreDays.length > 0 ? null : newItem.date,
          startDate: newItem.choreDays.length > 0 ? newItem.date : null,
          repeatDays: newItem.choreDays.length > 0 ? newItem.choreDays : null 
        }];
      }
    } else if (modalType === 'grocery' && newItem.item) {
      const id = Date.now();
      newData.grocery = [...(weekData.grocery || []), { id, item: newItem.item, done: false }];
    }
    
    setWeekData(newData); 
    saveToFirebase(newData);
    closeModal();
  };

  const closeModal = () => {
    setNewItem({ 
      title: '', time: '09:00', person: 'Chris', personOther: '', kid: 'Camilla', 
      day: selectedDayIndex, meal: '', prep: 'Chris', task: '', item: '', 
      date: selectedDate, category: 'kids', recurrence: 'none', allDay: false,
      choreDays: []
    });
    setShowAddModal(false); 
    setSelectedCalendarDate(null);
    setEditingEvent(null);
    setEditingChore(null);
    setEditSeriesMode(null);
  };

  // Colorful badges
  const PersonBadge = ({ person, size = 'sm' }) => {
    const styles = {
      Chris: 'bg-blue-200 text-blue-700',
      Alex: 'bg-rose-200 text-rose-700',
      Both: 'bg-purple-200 text-purple-700'
    };
    const icons = { Chris: '👨', Alex: '👩', Both: '👨👩' };
    return (
      <span className={`${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-full font-bold ${styles[person] || 'bg-stone-200 text-stone-700'}`}>
        {icons[person] || ''} {size !== 'icon' && person}
      </span>
    );
  };

  const KidBadge = ({ kid }) => {
    const styles = {
      Camilla: 'bg-pink-200 text-pink-700',
      Asher: 'bg-emerald-200 text-emerald-700',
      Both: 'bg-amber-200 text-amber-700'
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${styles[kid] || 'bg-stone-200 text-stone-700'}`}>{kid}</span>;
  };

  const NavButton = ({ view, icon, label }) => (
    <button onClick={() => setCurrentView(view)} className="flex flex-col items-center">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${
        currentView === view 
          ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-200' 
          : 'bg-stone-100 hover:bg-stone-200'
      }`}>
        {icon}
      </div>
      <span className={`text-xs font-bold mt-1 ${currentView === view ? 'text-purple-600' : 'text-stone-400'}`}>{label}</span>
    </button>
  );

  const getDaysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d) => { const day = new Date(d.getFullYear(), d.getMonth(), 1).getDay(); return day === 0 ? 6 : day - 1; };

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-b from-violet-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-6xl mb-4 animate-bounce">🏠</div>
        <p className="font-bold text-xl">Loading Family HQ...</p>
      </div>
    </div>
  );

  const EventCard = ({ event, dateStr, showDate, onClick }) => {
    const cat = getCategoryInfo(event.category);
    const isAllDay = event.allDay;
    const isRecurring = event.recurrence && event.recurrence !== 'none';
    
    return (
      <div 
        className={`rounded-2xl p-4 border-2 cursor-pointer transition-all hover:scale-[1.02] ${
          isAllDay 
            ? 'bg-gradient-to-r from-purple-100 to-fuchsia-100 border-purple-200' 
            : 'bg-gradient-to-r from-stone-50 to-white border-stone-200'
        }`}
        onClick={() => onClick(event, dateStr)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-md`}>
            <span className="text-2xl">{cat.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-stone-800">{event.title}</span>
              {isAllDay && <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">ALL DAY</span>}
              {isRecurring && <span className="text-xs text-stone-400">🔄</span>}
              {event.isException && <span className="text-xs text-orange-400">✎</span>}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {!isAllDay && <span className="bg-stone-200 text-stone-600 text-xs px-2 py-0.5 rounded-full font-bold">⏰ {formatTime(event.time)}</span>}
              {showDate && <span className="text-xs text-stone-400">{new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
              <PersonBadge person={event.person} />
              {event.kid !== 'None' && <KidBadge kid={event.kid} />}
            </div>
          </div>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (isRecurring) deleteEvent(event.id, dateStr, 'single');
              else deleteEvent(event.id);
            }} 
            className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-all"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  const KidCard = ({ name, data }) => {
    const kidKey = name.toLowerCase(); 
    const dayData = data?.[selectedDayIndex] || { location: 'No Daycare', dropoff: 'Chris', pickup: 'Alex', caregiver: 'Chris', caregiverOther: '' }; 
    const isNoDaycare = dayData.location === 'No Daycare';
    const isGirl = name === 'Camilla';
    
    const [localCaregiverOther, setLocalCaregiverOther] = useState(dayData.caregiverOther || '');
    
    useEffect(() => {
      setLocalCaregiverOther(dayData.caregiverOther || '');
    }, [dayData.caregiverOther, selectedDayIndex]);
    
    const getCaregiverDisplay = () => {
      if (dayData.caregiver === 'Other' && dayData.caregiverOther) return dayData.caregiverOther;
      return dayData.caregiver || 'Chris';
    };

    return (
      <div className={`rounded-3xl p-4 shadow-lg border-2 ${
        isGirl 
          ? 'bg-gradient-to-br from-pink-100 to-rose-200 border-pink-200' 
          : 'bg-gradient-to-br from-emerald-100 to-teal-200 border-emerald-200'
      }`}>
        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${
            isGirl ? 'from-pink-300 to-rose-400' : 'from-emerald-300 to-teal-400'
          } flex items-center justify-center text-3xl shadow-lg mb-2 border-4 border-white`}>
            {isGirl ? '👧' : '👦'}
          </div>
          <h3 className={`font-black ${isGirl ? 'text-pink-800' : 'text-emerald-800'}`}>{name}</h3>
          
          <select 
            value={dayData.location} 
            onChange={(e) => updateKidDay(kidKey, selectedDayIndex, 'location', e.target.value)} 
            className={`text-xs font-medium mt-1 bg-transparent border-0 text-center ${isGirl ? 'text-pink-600' : 'text-emerald-600'}`}
          >
            {locations.map(l => <option key={l}>{l}</option>)}
          </select>
          
          <div className="w-full mt-3 space-y-1">
            {isNoDaycare ? (
              <div className="bg-white/70 rounded-lg py-2 px-2">
                <span className={`text-xs ${isGirl ? 'text-pink-600' : 'text-emerald-600'}`}>With</span>
                {dayData.caregiver === 'Other' ? (
                  <div className="mt-1">
                    <input 
                      type="text" 
                      placeholder="Who?" 
                      value={localCaregiverOther} 
                      onChange={(e) => setLocalCaregiverOther(e.target.value)}
                      onBlur={() => updateKidDay(kidKey, selectedDayIndex, 'caregiverOther', localCaregiverOther)}
                      className="w-full text-xs font-bold text-center bg-transparent border-b border-stone-300 focus:outline-none"
                    />
                    <button onClick={() => { updateKidDay(kidKey, selectedDayIndex, 'caregiver', 'Chris'); }} className="text-xs text-amber-600 mt-1">← Back</button>
                  </div>
                ) : (
                  <select 
                    value={dayData.caregiver || 'Chris'} 
                    onChange={(e) => updateKidDay(kidKey, selectedDayIndex, 'caregiver', e.target.value)}
                    className={`w-full text-xs font-bold text-center bg-transparent border-0 ${isGirl ? 'text-pink-800' : 'text-emerald-800'}`}
                  >
                    {caregiverOptions.map(c => <option key={c} value={c}>{c === 'Other' ? 'Other...' : c}</option>)}
                  </select>
                )}
              </div>
            ) : (
              <>
                <div className="bg-white/70 rounded-lg py-1.5 px-2 flex justify-between items-center">
                  <span className={`text-xs ${isGirl ? 'text-pink-600' : 'text-emerald-600'}`}>Drop</span>
                  <select 
                    value={dayData.dropoff} 
                    onChange={(e) => updateKidDay(kidKey, selectedDayIndex, 'dropoff', e.target.value)}
                    className={`text-xs font-bold bg-transparent border-0 ${isGirl ? 'text-pink-800' : 'text-emerald-800'}`}
                  >
                    {people.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="bg-white/70 rounded-lg py-1.5 px-2 flex justify-between items-center">
                  <span className={`text-xs ${isGirl ? 'text-pink-600' : 'text-emerald-600'}`}>Pick</span>
                  <select 
                    value={dayData.pickup} 
                    onChange={(e) => updateKidDay(kidKey, selectedDayIndex, 'pickup', e.target.value)}
                    className={`text-xs font-bold bg-transparent border-0 ${isGirl ? 'text-pink-800' : 'text-emerald-800'}`}
                  >
                    {people.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const CalendarView = () => {
    const daysInMonth = getDaysInMonth(currentMonth); 
    const firstDay = getFirstDayOfMonth(currentMonth);
    const calendarDays = [...Array(firstDay).fill(null), ...Array(daysInMonth).fill(null).map((_, i) => i + 1)];
    const getDateString = (day) => day ? formatDateLocal(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : null;
    const todayStr = getTodayStr();
    const isTodayCell = (day) => day && getDateString(day) === todayStr;
    
    const getUpcomingEvents = () => { 
      const events = []; 
      for (let i = 0; i < 30; i++) { 
        const d = new Date(); d.setDate(d.getDate() + i); 
        const ds = formatDateLocal(d); 
        getEventsForDate(ds).forEach(e => events.push({ ...e, displayDate: ds })); 
      } 
      return events; 
    };

    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-stone-800">📅 Calendar</h2>
          <div className="flex gap-1 bg-stone-100 p-1 rounded-xl">
            <button onClick={() => setCalendarView('month')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${calendarView === 'month' ? 'bg-white shadow-sm' : ''}`}>Month</button>
            <button onClick={() => setCalendarView('list')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${calendarView === 'list' ? 'bg-white shadow-sm' : ''}`}>List</button>
          </div>
        </div>
        
        {calendarView === 'month' ? <>
          <div className="flex items-center justify-between bg-white rounded-2xl p-3 border-2 border-stone-100">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="w-10 h-10 rounded-xl bg-stone-100 font-bold">‹</button>
            <h3 className="font-black text-stone-800">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="w-10 h-10 rounded-xl bg-stone-100 font-bold">›</button>
          </div>
          <div className="bg-white rounded-2xl border-2 border-stone-100 overflow-hidden">
            <div className="grid grid-cols-7 bg-gradient-to-r from-violet-500 to-purple-600">{dayLetters.map((d,i) => <div key={i} className="py-3 text-center text-xs font-bold text-white">{d}</div>)}</div>
            <div className="grid grid-cols-7">{calendarDays.map((day, i) => {
              const dateStr = getDateString(day); 
              const events = dateStr ? getEventsForDate(dateStr) : [];
              return (
                <div key={i} onClick={() => day && setSelectedCalendarDate(dateStr)} className={`min-h-[60px] p-1 border-b border-r border-stone-100 cursor-pointer transition-colors ${!day ? 'bg-stone-50' : selectedCalendarDate === dateStr ? 'bg-purple-50' : 'hover:bg-stone-50'}`}>
                  {day && <>
                    <div className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold ${isTodayCell(day) ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white' : ''}`}>{day}</div>
                    <div className="space-y-0.5 mt-1">{events.slice(0,2).map((e,j) => <div key={j} className="text-white px-1 rounded truncate font-bold" style={{ backgroundColor: getCategoryInfo(e.category).color, fontSize: 8 }}>{e.title}</div>)}{events.length > 2 && <div className="text-stone-400 font-bold" style={{ fontSize: 8 }}>+{events.length-2}</div>}</div>
                  </>}
                </div>
              );
            })}</div>
          </div>
          {selectedCalendarDate && (
            <div className="bg-white rounded-2xl p-4 border-2 border-stone-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-black text-stone-800">{new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                <button onClick={() => openModal('event', selectedCalendarDate)} className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white font-black shadow-md">+</button>
              </div>
              {getEventsForDate(selectedCalendarDate).length === 0 
                ? <p className="text-stone-400 text-sm text-center py-4">No events</p> 
                : <div className="space-y-2">{getEventsForDate(selectedCalendarDate).map((e,i) => <EventCard key={i} event={e} dateStr={selectedCalendarDate} onClick={openEditModal} />)}</div>
              }
            </div>
          )}
          <div className="flex flex-wrap gap-2">{eventCategories.map(c => <div key={c.id} className="flex items-center gap-1 text-xs font-bold"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }}></div>{c.label}</div>)}</div>
        </> : <>
          <button onClick={() => openModal('event')} className="w-full py-4 rounded-2xl border-3 border-dashed border-stone-200 text-stone-400 font-bold hover:border-purple-300 hover:text-purple-500 transition-colors">+ Add New Event</button>
          <div className="space-y-3">{getUpcomingEvents().length === 0 ? <p className="text-stone-400 text-center py-8">No upcoming events</p> : getUpcomingEvents().map((e,i) => <EventCard key={i} event={e} dateStr={e.displayDate} showDate onClick={openEditModal} />)}</div>
        </>}
      </div>
    );
  };

  const DashboardView = () => {
    const todayStr = getTodayStr();
    const isCurrentWeek = weekDates.includes(todayStr);
    const choreStats = getChoreStats(selectedDate);
    const chorePercent = choreStats.total > 0 ? Math.round((choreStats.completed / choreStats.total) * 100) : 0;
    const meal = getMealForDate(selectedDate);
    const events = getEventsForDate(selectedDate);
    
    return (
      <div className="space-y-4 pb-24">
        {/* Week selector in header area */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={goToPreviousWeek} className="w-8 h-8 rounded-full bg-white/30 text-white flex items-center justify-center font-bold">‹</button>
          <div className="flex gap-2">
            {weekDates.map((dateStr, i) => {
              const dateObj = new Date(dateStr + 'T00:00:00');
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              return (
                <button 
                  key={dateStr} 
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                    isSelected 
                      ? 'bg-white text-purple-600 shadow-lg scale-105' 
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                  style={{ minWidth: 40 }}
                >
                  <div className="text-xs font-bold">{shortDays[i]}</div>
                  <div className="text-lg font-black mt-0.5">{dateObj.getDate()}</div>
                  {isToday && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1"></div>}
                </button>
              );
            })}
          </div>
          <button onClick={goToNextWeek} className="w-8 h-8 rounded-full bg-white/30 text-white flex items-center justify-center font-bold">›</button>
        </div>
        
        {selectedDate !== todayStr && (
          <button onClick={goToToday} className="w-full py-2 text-white/80 text-sm font-bold hover:text-white transition-colors">
            ← Back to Today
          </button>
        )}

        {/* Highlights Card */}
        <div className="bg-white rounded-3xl p-5 shadow-xl border-4 border-amber-200 -mt-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🌟</span>
            <h2 className="font-black text-stone-800 text-lg">{days[selectedDayIndex]}'s Highlights</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-sky-100 to-sky-200 rounded-2xl p-3 text-center">
              <div className="text-3xl mb-1">📅</div>
              <div className="text-xl font-black text-sky-700">{events.length}</div>
              <div className="text-xs text-sky-600 font-medium">Events</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl p-3 text-center">
              <div className="text-3xl mb-1">✨</div>
              <div className="text-xl font-black text-emerald-700">{choreStats.completed}/{choreStats.total}</div>
              <div className="text-xs text-emerald-600 font-medium">Chores</div>
            </div>
            <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl p-3 text-center">
              <div className="text-3xl mb-1">{meal ? '🍽️' : '❓'}</div>
              <div className="text-sm font-bold text-orange-700 truncate">{meal ? meal.meal.split(' ')[0] : 'None'}</div>
              <div className="text-xs text-orange-600 font-medium">Dinner</div>
            </div>
          </div>
        </div>

        {/* Weather (only current week) */}
        {isCurrentWeek && weather && !weatherLoading && (
          <div className="bg-gradient-to-r from-sky-400 to-blue-500 rounded-3xl p-4 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getWeatherInfo(weather.current.weather_code).icon}</span>
                <div>
                  <div className="text-3xl font-black">{Math.round(weather.current.temperature_2m)}°</div>
                  <div className="text-sm text-white/80">{getWeatherInfo(weather.current.weather_code).desc}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/80">Cronulla</div>
                <div className="text-sm font-bold">{Math.round(weather.daily.temperature_2m_max[0])}° / {Math.round(weather.daily.temperature_2m_min[0])}°</div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-sky-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-md">
                <span className="text-xl">📅</span>
              </div>
              <h3 className="font-black text-stone-800">Schedule</h3>
            </div>
            <button onClick={() => openModal('event', selectedDate)} className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md hover:scale-105 transition-transform">+</button>
          </div>
          
          {events.length === 0 
            ? <p className="text-stone-400 text-center py-4 font-medium">No events — tap + to add</p>
            : <div className="space-y-3">{events.map((e,i) => <EventCard key={i} event={e} dateStr={selectedDate} onClick={openEditModal} />)}</div>
          }
        </div>

        {/* Kids */}
        <div className="grid grid-cols-2 gap-4">
          <KidCard name="Camilla" data={weekData.kids.camilla} />
          <KidCard name="Asher" data={weekData.kids.asher} />
        </div>

        {/* Dinner */}
        <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-3xl p-5 shadow-lg border-2 border-orange-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
              <span className="text-3xl">{meal ? '🍽️' : '❓'}</span>
            </div>
            <div className="flex-1">
              <p className="text-xs text-orange-600 font-bold uppercase">Tonight's Dinner</p>
              {meal ? (
                <>
                  <h3 className="font-black text-xl text-stone-800">{meal.meal}</h3>
                  <p className="text-sm text-orange-700">Chef: <span className="font-bold">{meal.prep}</span> 👨‍🍳</p>
                </>
              ) : (
                <h3 className="font-black text-xl text-stone-400">Not planned</h3>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => openModal('meal', selectedDate)} className="w-10 h-10 rounded-xl bg-orange-200 text-orange-600 font-black hover:bg-orange-300 transition-colors">+</button>
              {meal && (
                <button onClick={() => deleteMeal(meal.id)} className="w-10 h-10 rounded-xl bg-red-100 text-red-500 font-bold hover:bg-red-200 transition-colors">✕</button>
              )}
            </div>
          </div>
        </div>

        {/* Chores */}
        <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-emerald-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-md">
                <span className="text-xl">✨</span>
              </div>
              <h3 className="font-black text-stone-800">Chores</h3>
            </div>
            <div className="flex items-center gap-2">
              {choreStats.total > 0 && (
                <div className="flex items-center gap-2 bg-emerald-100 px-3 py-1.5 rounded-full">
                  <span className="text-lg">🏆</span>
                  <span className="font-black text-emerald-700">{chorePercent}%</span>
                </div>
              )}
              <button onClick={() => openModal('chore')} className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-600 flex items-center justify-center font-black hover:bg-stone-200 transition-colors">+</button>
            </div>
          </div>
          
          {/* Progress bar */}
          {choreStats.total > 0 && (
            <div className="h-4 bg-stone-100 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${Math.max(chorePercent, 10)}%` }}
              >
                {chorePercent > 20 && <span className="text-white text-xs font-bold">{choreStats.completed}/{choreStats.total}</span>}
              </div>
            </div>
          )}
          
          {getChoresForDate(selectedDate).length === 0 
            ? <p className="text-stone-400 text-center py-4 font-medium">No chores! 🎉</p>
            : (
              <div className="space-y-2">
                {getChoresForDate(selectedDate).map(c => {
                  const isCompleted = isChoreCompletedForDate(c.id, selectedDate);
                  const repeatLabel = getChoreRepeatLabel(c);
                  return (
                    <div 
                      key={c.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                        isCompleted 
                          ? 'bg-emerald-50 border-emerald-200' 
                          : 'bg-stone-50 border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                      onClick={() => openEditChoreModal(c)}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleChoreForDate(c.id, selectedDate); }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow transition-all ${
                          isCompleted 
                            ? 'bg-gradient-to-br from-emerald-400 to-green-500' 
                            : 'border-3 border-stone-300 bg-white'
                        }`}
                      >
                        {isCompleted && <span className="text-white text-sm">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={`font-medium ${isCompleted ? 'text-stone-400 line-through' : 'text-stone-800'}`}>{c.task}</span>
                        {repeatLabel && <span className="ml-2 text-xs text-stone-400">🔄 {repeatLabel}</span>}
                      </div>
                      <PersonBadge person={c.person} />
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteChore(c.id); }}
                        className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>
    );
  };

  const GroceryView = () => (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-stone-800">🛒 Grocery List</h2>
        <button onClick={() => openModal('grocery')} className="px-4 py-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold shadow-md">+ Add</button>
      </div>
      <div className="bg-white rounded-3xl border-2 border-stone-100 overflow-hidden shadow-lg">
        {(weekData.grocery || []).length === 0 
          ? <p className="text-stone-400 text-center py-8 font-medium">No items — tap + to add</p> 
          : (weekData.grocery || []).map((g, i) => (
            <div key={g.id} className={`flex items-center gap-3 p-4 ${i < weekData.grocery.length - 1 ? 'border-b border-stone-100' : ''} ${g.done ? 'bg-emerald-50' : ''}`}>
              <button 
                onClick={() => toggleGrocery(g.id)} 
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  g.done 
                    ? 'bg-gradient-to-br from-emerald-400 to-green-500 shadow' 
                    : 'border-2 border-stone-300'
                }`}
              >
                {g.done && <span className="text-white text-sm">✓</span>}
              </button>
              <span className={`flex-1 font-medium ${g.done ? 'line-through text-stone-400' : 'text-stone-800'}`}>{g.item}</span>
              <button onClick={() => deleteGroceryItem(g.id)} className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors">✕</button>
            </div>
          ))
        }
      </div>
    </div>
  );

  const MealsView = () => {
    const [mealWeekStart, setMealWeekStart] = useState(getWeekStart(getTodayStr()));
    const getMealWeekDates = () => {
      const monday = new Date(mealWeekStart + 'T00:00:00');
      return Array(7).fill(null).map((_, i) => {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        return formatDateLocal(d);
      });
    };
    const mealWeekDates = getMealWeekDates();
    
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-stone-800">🍽️ Meal Plan</h2>
          <button onClick={() => openModal('meal', selectedDate)} className="px-4 py-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold shadow-md">+ Add</button>
        </div>
        
        <div className="flex items-center justify-between bg-white rounded-2xl p-3 border-2 border-stone-100">
          <button onClick={() => { const d = new Date(mealWeekStart + 'T00:00:00'); d.setDate(d.getDate() - 7); setMealWeekStart(formatDateLocal(d)); }} className="w-10 h-10 rounded-xl bg-stone-100 font-bold">‹</button>
          <span className="font-bold text-stone-700">
            {new Date(mealWeekDates[0] + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - {new Date(mealWeekDates[6] + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
          </span>
          <button onClick={() => { const d = new Date(mealWeekStart + 'T00:00:00'); d.setDate(d.getDate() + 7); setMealWeekStart(formatDateLocal(d)); }} className="w-10 h-10 rounded-xl bg-stone-100 font-bold">›</button>
        </div>
        
        <div className="space-y-3">
          {mealWeekDates.map((dateStr, i) => {
            const meal = getMealForDate(dateStr);
            const isTodayMeal = dateStr === getTodayStr();
            return (
              <div key={dateStr} className={`bg-white rounded-2xl p-4 border-2 flex items-center gap-4 ${isTodayMeal ? 'border-amber-300 bg-amber-50' : 'border-stone-100'}`}>
                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center ${isTodayMeal ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-stone-100'}`}>
                  <span className="text-xs font-bold">{shortDays[i]}</span>
                  <span className="text-lg font-black">{new Date(dateStr + 'T00:00:00').getDate()}</span>
                </div>
                <div className="flex-1">
                  {meal ? (
                    <>
                      <h3 className="font-bold text-stone-800">{meal.meal}</h3>
                      <p className="text-sm text-stone-500">Chef: {meal.prep}</p>
                    </>
                  ) : (
                    <p className="text-stone-400 font-medium">No meal planned</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {meal ? (
                    <button onClick={() => deleteMeal(meal.id)} className="w-10 h-10 rounded-xl bg-red-100 text-red-500 font-bold hover:bg-red-200 transition-colors">✕</button>
                  ) : (
                    <button onClick={() => { setNewItem(p => ({ ...p, date: dateStr })); openModal('meal', dateStr); }} className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 font-black hover:bg-orange-200 transition-colors">+</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const WhoSelector = () => (
    <div>
      <label className="text-xs text-stone-500 font-bold">Who</label>
      {newItem.person === 'Other' ? (
        <div className="space-y-1">
          <input type="text" placeholder="Enter name..." value={newItem.personOther} onChange={e => setNewItem(p => ({ ...p, personOther: e.target.value }))} className="w-full px-3 py-2 rounded-xl border-2 border-stone-200 text-sm font-medium" />
          <button onClick={() => setNewItem(p => ({ ...p, person: 'Chris', personOther: '' }))} className="text-xs text-purple-600 font-bold">← Back</button>
        </div>
      ) : (
        <select value={newItem.person} onChange={e => setNewItem(p => ({ ...p, person: e.target.value }))} className="w-full px-3 py-2 rounded-xl border-2 border-stone-200 text-sm font-medium">
          {people.map(p => <option key={p}>{p}</option>)}
          <option value="Other">Other...</option>
        </select>
      )}
    </div>
  );

  const ChoreDayPicker = () => {
    const hasRepeatDays = newItem.choreDays && newItem.choreDays.length > 0;
    return (
      <div>
        <label className="text-xs text-stone-500 font-bold">Repeats</label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <button onClick={() => setNewItem(p => ({ ...p, choreDays: [] }))} className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 ${!hasRepeatDays ? 'bg-purple-100 border-purple-400 text-purple-700' : 'border-stone-200 text-stone-600'}`}>One-time</button>
            <button onClick={() => setNewItem(p => ({ ...p, choreDays: [getDayIndexFromDate(p.date)] }))} className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 ${hasRepeatDays ? 'bg-purple-100 border-purple-400 text-purple-700' : 'border-stone-200 text-stone-600'}`}>Repeating</button>
          </div>
          {hasRepeatDays && (
            <div className="bg-stone-50 rounded-xl p-3">
              <p className="text-xs text-stone-500 font-bold mb-2">Select days:</p>
              <div className="flex gap-1">
                {dayLetters.map((letter, index) => (
                  <button key={index} onClick={() => toggleChoreDay(index)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newItem.choreDays.includes(index) ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow' : 'bg-white text-stone-600 border-2 border-stone-200'}`}>{letter}</button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setNewItem(p => ({ ...p, choreDays: [0,1,2,3,4,5,6] }))} className="text-xs text-purple-600 font-bold">Every day</button>
                <span className="text-stone-300">|</span>
                <button onClick={() => setNewItem(p => ({ ...p, choreDays: [0,1,2,3,4] }))} className="text-xs text-purple-600 font-bold">Weekdays</button>
                <span className="text-stone-300">|</span>
                <button onClick={() => setNewItem(p => ({ ...p, choreDays: [5,6] }))} className="text-xs text-purple-600 font-bold">Weekends</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const SeriesEditChoice = () => (
    <div className="space-y-3">
      <p className="text-sm text-stone-600 text-center font-medium">This is a recurring event. What would you like to edit?</p>
      <button onClick={() => proceedWithEventEdit(editingEvent, editingEvent.editDate, 'single')} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-100 to-fuchsia-100 text-purple-700 font-bold border-2 border-purple-200">✏️ Just this occurrence</button>
      <button onClick={() => proceedWithEventEdit(editingEvent, editingEvent.editDate, 'all')} className="w-full py-3 rounded-xl bg-stone-100 text-stone-700 font-bold border-2 border-stone-200">🔄 All occurrences</button>
      <button onClick={closeModal} className="w-full py-2 text-stone-500 font-medium">Cancel</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-amber-50 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-5 py-6 rounded-b-3xl shadow-lg">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between text-white mb-4">
            <div>
              <p className="text-white/70 text-sm font-medium">{getGreeting()}</p>
              <h1 className="text-2xl font-black">Family HQ</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></div>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-pink-300 border-2 border-white flex items-center justify-center text-sm shadow">👧</div>
                <div className="w-8 h-8 rounded-full bg-emerald-300 border-2 border-white flex items-center justify-center text-sm shadow">👦</div>
                <div className="w-8 h-8 rounded-full bg-blue-300 border-2 border-white flex items-center justify-center text-sm shadow">👨</div>
                <div className="w-8 h-8 rounded-full bg-rose-300 border-2 border-white flex items-center justify-center text-sm shadow">👩</div>
              </div>
            </div>
          </div>
          
          {currentView === 'dashboard' && <DashboardView />}
        </div>
      </div>
      
      {currentView !== 'dashboard' && (
        <main className="max-w-md mx-auto px-5 py-6">
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'meals' && <MealsView />}
          {currentView === 'grocery' && <GroceryView />}
        </main>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-purple-200 px-4 py-3 pb-6">
        <div className="flex justify-around max-w-md mx-auto">
          <NavButton view="dashboard" icon="📋" label="Today" />
          <NavButton view="calendar" icon="📅" label="Calendar" />
          <NavButton view="meals" icon="🍽️" label="Meals" />
          <NavButton view="grocery" icon="🛒" label="Grocery" />
        </div>
      </nav>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={closeModal}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-stone-800 text-lg">
                {editSeriesMode === 'choosing' ? '🔄 Edit Recurring Event' :
                 modalType === 'event' ? (editingEvent ? '✏️ Edit Event' : '📅 Add Event') : 
                 modalType === 'meal' ? '🍽️ Add Meal' : 
                 modalType === 'chore' ? (editingChore ? '✏️ Edit Chore' : '✨ Add Chore') : 
                 '🛒 Add Item'}
              </h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 font-bold">✕</button>
            </div>
            
            {editSeriesMode === 'choosing' ? <SeriesEditChoice /> : (
              <div className="space-y-3">
                {modalType === 'event' && <>
                  <input type="text" placeholder="Event title" value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 font-medium" />
                  <div className="flex items-center justify-between bg-stone-50 rounded-xl p-3">
                    <span className="font-medium text-stone-700">All Day Event</span>
                    <button onClick={() => setNewItem(p => ({ ...p, allDay: !p.allDay }))} className={`w-14 h-8 rounded-full transition-colors ${newItem.allDay ? 'bg-purple-500' : 'bg-stone-300'}`}>
                      <div className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform ${newItem.allDay ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-stone-500 font-bold">Date</label><input type="date" value={newItem.date} onChange={e => setNewItem(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border-2 border-stone-200 font-medium" disabled={editSeriesMode === 'single'} /></div>
                    {!newItem.allDay && <div><label className="text-xs text-stone-500 font-bold">Time</label><input type="time" value={newItem.time} onChange={e => setNewItem(p => ({ ...p, time: e.target.value }))} className="w-full px-3 py-2 rounded-xl border-2 border-stone-200 font-medium" /></div>}
                  </div>
                  <div><label className="text-xs text-stone-500 font-bold">Category</label><div className="grid grid-cols-3 gap-2 mt-1">{eventCategories.map(c => <button key={c.id} onClick={() => setNewItem(p => ({ ...p, category: c.id }))} className={`flex items-center gap-1 px-2 py-2 rounded-xl border-2 text-xs font-bold ${newItem.category === c.id ? 'border-purple-400 bg-purple-50' : 'border-stone-200'}`}><span>{c.icon}</span>{c.label}</button>)}</div></div>
                  {editSeriesMode !== 'single' && <div><label className="text-xs text-stone-500 font-bold">Repeats</label><select value={newItem.recurrence} onChange={e => setNewItem(p => ({ ...p, recurrence: e.target.value }))} className="w-full px-3 py-2 rounded-xl border-2 border-stone-200 font-medium mt-1">{recurrenceOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>}
                  <div className="grid grid-cols-2 gap-2">
                    <WhoSelector />
                    <div><label className="text-xs text-stone-500 font-bold">Kid</label><select value={newItem.kid} onChange={e => setNewItem(p => ({ ...p, kid: e.target.value }))} className="w-full px-3 py-2 rounded-xl border-2 border-stone-200 font-medium"><option>Camilla</option><option>Asher</option><option>Both</option><option>None</option></select></div>
                  </div>
                  {editingEvent && <button onClick={() => { deleteEvent(editingEvent.id, editSeriesMode === 'single' ? editingEvent.editDate : null, editSeriesMode === 'single' ? 'single' : 'all'); closeModal(); }} className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 font-bold hover:bg-red-50">🗑️ Delete</button>}
                </>}
                {modalType === 'meal' && <>
                  <div className="bg-orange-50 rounded-xl p-3"><p className="text-sm text-orange-700 font-medium">Planning for: <span className="font-bold">{new Date(newItem.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</span></p></div>
                  <input type="text" placeholder="What's for dinner?" value={newItem.meal} onChange={e => setNewItem(p => ({ ...p, meal: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 font-medium" />
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-stone-500 font-bold">Chef</label><select value={newItem.prep} onChange={e => setNewItem(p => ({ ...p, prep: e.target.value }))} className="w-full px-3 py-2 rounded-xl border-2 border-stone-200 font-medium">{people.map(p => <option key={p}>{p}</option>)}</select></div>
                    <div><label className="text-xs text-stone-500 font-bold">Date</label><input type="date" value={newItem.date} onChange={e => setNewItem(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border-2 border-stone-200 font-medium" /></div>
                  </div>
                </>}
                {modalType === 'chore' && <>
                  <input type="text" placeholder="What needs doing?" value={newItem.task} onChange={e => setNewItem(p => ({ ...p, task: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 font-medium" />
                  <div className="grid grid-cols-2 gap-2">
                    <WhoSelector />
                    <div><label className="text-xs text-stone-500 font-bold">Date</label><input type="date" value={newItem.date} onChange={e => setNewItem(p => ({ ...p, date: e.target.value, day: getDayIndexFromDate(e.target.value) }))} className="w-full px-3 py-2 rounded-xl border-2 border-stone-200 font-medium" /></div>
                  </div>
                  <ChoreDayPicker />
                  {editingChore && <button onClick={() => { deleteChore(editingChore.id); closeModal(); }} className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 font-bold hover:bg-red-50">🗑️ Delete Chore</button>}
                </>}
                {modalType === 'grocery' && <input type="text" placeholder="Add item..." value={newItem.item} onChange={e => setNewItem(p => ({ ...p, item: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addItem()} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 font-medium" />}
                <button onClick={addItem} className={`w-full py-4 rounded-xl text-white font-black text-lg shadow-lg ${modalType === 'event' ? 'bg-gradient-to-r from-violet-500 to-purple-600' : modalType === 'meal' ? 'bg-gradient-to-r from-orange-500 to-amber-500' : modalType === 'chore' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
                  {editingEvent || editingChore ? 'Save Changes' : 'Add'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
