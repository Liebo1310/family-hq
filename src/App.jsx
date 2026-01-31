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
  const [editSeriesMode, setEditSeriesMode] = useState(null); // 'single' or 'all'
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
    { id: 'kids', label: 'Kids', color: '#4ECDC4', icon: '👶' },
    { id: 'appointments', label: 'Appts', color: '#FF6B6B', icon: '🏥' },
    { id: 'work', label: 'Work', color: '#9B59B6', icon: '💼' },
    { id: 'family', label: 'Family', color: '#F39C12', icon: '👨‍👩‍👧‍👦' },
    { id: 'other', label: 'Other', color: '#95A5A6', icon: '📌' },
  ];
  
  const recurrenceOptions = [
    { id: 'none', label: 'Does not repeat' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'fortnightly', label: 'Fortnightly' },
    { id: 'monthly', label: 'Monthly' },
  ];

  // Format date as YYYY-MM-DD in local timezone
  function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Get day index (0=Monday, 6=Sunday) from a date string
  const getDayIndexFromDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
  };

  // Get today's date string
  const getTodayStr = () => formatDateLocal(new Date());

  // Check if a date is today
  const isToday = (dateStr) => dateStr === getTodayStr();

  // Get week start (Monday) for a given date
  const getWeekStart = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.getFullYear(), date.getMonth(), diff);
    return formatDateLocal(monday);
  };

  // Get array of dates for the week containing selectedDate
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

  // Navigate weeks
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

  // Format date for display
  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatWeekLabel = () => {
    const start = new Date(weekDates[0] + 'T00:00:00');
    const end = new Date(weekDates[6] + 'T00:00:00');
    const todayStr = getTodayStr();
    
    if (weekDates.includes(todayStr)) {
      return `This Week (${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })})`;
    }
    
    const nextWeekStart = new Date(todayStr + 'T00:00:00');
    nextWeekStart.setDate(nextWeekStart.getDate() + 7 - getDayIndexFromDate(todayStr));
    if (weekDates[0] === formatDateLocal(nextWeekStart) || weekDates.includes(formatDateLocal(nextWeekStart))) {
      return `Next Week (${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })})`;
    }
    
    return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`;
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
    eventExceptions: [], // For single occurrence edits: { eventId, date, changes: {...} } or { eventId, date, deleted: true }
    kids: {
      camilla: Array(7).fill(null).map((_, i) => ({ day: i, location: i < 5 ? 'Little Palace' : 'No Daycare', dropoff: 'Chris', pickup: 'Alex', caregiver: 'Chris', caregiverOther: '' })),
      asher: Array(7).fill(null).map((_, i) => ({ day: i, location: i < 5 ? 'Little Palace' : 'No Daycare', dropoff: 'Alex', pickup: 'Chris', caregiver: 'Alex', caregiverOther: '' }))
    },
    meals: [], // Now date-based: { id, meal, prep, date: "YYYY-MM-DD" }
    chores: [], // { id, task, person, date (for one-time) OR repeatDays (for recurring), startDate }
    choreCompletions: [], // { choreId, date } - tracks which chores are done on which dates
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

  // Check if event occurs on date (handles recurrence and exceptions)
  const eventOccursOnDate = (event, targetDateStr) => {
    const eventDate = new Date(event.date + 'T00:00:00');
    const targetDate = new Date(targetDateStr + 'T00:00:00');
    
    if (targetDate < eventDate) return false;
    
    // Check if this occurrence is deleted
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

  // Get event with any exceptions applied for a specific date
  const getEventForDate = (event, dateStr) => {
    const exception = (weekData.eventExceptions || []).find(
      ex => ex.eventId === event.id && ex.date === dateStr && !ex.deleted
    );
    if (exception) {
      return { ...event, ...exception.changes, isException: true, exceptionDate: dateStr };
    }
    return event;
  };

  // Check if chore occurs on a specific date
  const choreOccursOnDate = (chore, targetDateStr) => {
    const targetDayIndex = getDayIndexFromDate(targetDateStr);
    
    // Recurring chore with repeatDays
    if (chore.repeatDays && Array.isArray(chore.repeatDays) && chore.repeatDays.length > 0) {
      // Check if target date is on or after start date
      if (chore.startDate) {
        const startDate = new Date(chore.startDate + 'T00:00:00');
        const targetDate = new Date(targetDateStr + 'T00:00:00');
        if (targetDate < startDate) return false;
      }
      return chore.repeatDays.includes(targetDayIndex);
    }
    
    // One-time chore - check exact date match
    return chore.date === targetDateStr;
  };

  // Check if chore is completed for a specific date
  const isChoreCompletedForDate = (choreId, dateStr) => {
    return (weekData.choreCompletions || []).some(
      c => c.choreId === choreId && c.date === dateStr
    );
  };

  // Toggle chore completion for a specific date
  const toggleChoreForDate = (choreId, dateStr) => {
    const isCompleted = isChoreCompletedForDate(choreId, dateStr);
    let newCompletions;
    
    if (isCompleted) {
      // Remove completion
      newCompletions = (weekData.choreCompletions || []).filter(
        c => !(c.choreId === choreId && c.date === dateStr)
      );
    } else {
      // Add completion
      newCompletions = [...(weekData.choreCompletions || []), { choreId, date: dateStr }];
    }
    
    const newData = { ...weekData, choreCompletions: newCompletions };
    setWeekData(newData);
    saveToFirebase(newData);
  };

  // Get display text for chore repeat days
  const getChoreRepeatLabel = (chore) => {
    if (!chore.repeatDays || chore.repeatDays.length === 0) {
      return null;
    }
    if (chore.repeatDays.length === 7) {
      return 'Daily';
    }
    if (chore.repeatDays.length === 5 && 
        chore.repeatDays.includes(0) && chore.repeatDays.includes(1) && 
        chore.repeatDays.includes(2) && chore.repeatDays.includes(3) && 
        chore.repeatDays.includes(4)) {
      return 'Weekdays';
    }
    if (chore.repeatDays.length === 2 && 
        chore.repeatDays.includes(5) && chore.repeatDays.includes(6)) {
      return 'Weekends';
    }
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
      // Add exception to mark this occurrence as deleted
      newData.eventExceptions = [
        ...(weekData.eventExceptions || []),
        { eventId: id, date: dateStr, deleted: true }
      ];
    } else {
      // Delete entire series
      newData.calendarEvents = weekData.calendarEvents.filter(e => e.id !== id);
      // Also clean up any exceptions for this event
      newData.eventExceptions = (weekData.eventExceptions || []).filter(ex => ex.eventId !== id);
    }
    
    setWeekData(newData);
    saveToFirebase(newData);
  };

  const deleteChore = (id) => { 
    const newData = { 
      ...weekData, 
      chores: weekData.chores.filter(c => c.id !== id),
      // Also clean up completions for this chore
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
      // Show choice dialog for recurring events
      setEditingEvent({ ...event, editDate: dateStr });
      setEditSeriesMode('choosing');
      setShowAddModal(true);
      setModalType('event');
    } else {
      // Non-recurring or already an exception - edit directly
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
          // Create or update exception for this occurrence
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
          // Update entire series
          newData.calendarEvents = weekData.calendarEvents.map(e => 
            e.id === editingEvent.id 
              ? { ...e, date: newItem.date, time: newItem.allDay ? null : newItem.time, title: newItem.title, person: finalPerson, kid: newItem.kid, category: newItem.category, recurrence: newItem.recurrence, allDay: newItem.allDay }
              : e
          );
        }
      } else {
        const id = Date.now();
        newData.calendarEvents = [...(weekData.calendarEvents || []), { 
          id, 
          date: newItem.date, 
          time: newItem.allDay ? null : newItem.time, 
          title: newItem.title, 
          person: finalPerson, 
          kid: newItem.kid, 
          category: newItem.category, 
          recurrence: newItem.recurrence, 
          allDay: newItem.allDay 
        }];
      }
    } else if (modalType === 'meal' && newItem.meal) {
      // Remove existing meal for this date, then add new one
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
                ...c, 
                task: newItem.task, 
                person: finalPerson,
                date: newItem.choreDays.length > 0 ? null : newItem.date,
                startDate: newItem.choreDays.length > 0 ? newItem.date : null,
                repeatDays: newItem.choreDays.length > 0 ? newItem.choreDays : null 
              }
            : c
        );
      } else {
        const id = Date.now();
        newData.chores = [...(weekData.chores || []), { 
          id, 
          task: newItem.task, 
          person: finalPerson,
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

  const PersonBadge = ({ person }) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${person === 'Chris' ? 'bg-blue-100 text-blue-700' : person === 'Alex' ? 'bg-rose-100 text-rose-700' : person === 'Both' ? 'bg-purple-100 text-purple-700' : 'bg-stone-200 text-stone-700'}`}>{person}</span>;
  const KidBadge = ({ kid }) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${kid === 'Camilla' ? 'bg-pink-100 text-pink-700' : kid === 'Asher' ? 'bg-emerald-100 text-emerald-700' : kid === 'Both' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>{kid}</span>;
  const NavButton = ({ view, icon, label }) => <button onClick={() => setCurrentView(view)} className={`flex flex-col items-center p-2 rounded-xl ${currentView === view ? 'bg-amber-100 text-amber-700' : 'text-stone-500'}`} style={{ minWidth: 56 }}><span className="text-lg">{icon}</span><span className="text-xs font-medium">{label}</span></button>;

  const WeatherWidget = () => {
    if (weatherLoading) return <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-100 animate-pulse"><div className="h-16"></div></div>;
    if (!weather) return null;
    
    const current = weather.current;
    const daily = weather.daily;
    const weatherInfo = getWeatherInfo(current.weather_code);
    
    return (
      <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-500 mb-1">Cronulla</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{weatherInfo.icon}</span>
              <div>
                <p className="text-2xl font-bold text-stone-800">{Math.round(current.temperature_2m)}°</p>
                <p className="text-xs text-stone-500">Feels {Math.round(current.apparent_temperature)}°</p>
              </div>
            </div>
            <p className="text-sm text-stone-600 mt-1">{weatherInfo.desc}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-500">Today</p>
            <p className="text-sm text-stone-700">{Math.round(daily.temperature_2m_max[0])}° / {Math.round(daily.temperature_2m_min[0])}°</p>
            <div className="flex gap-2 mt-2">
              {[1, 2].map(i => (
                <div key={i} className="text-center">
                  <p className="text-xs text-stone-400">{new Date(daily.time[i]).toLocaleDateString('en-AU', { weekday: 'short' })}</p>
                  <span className="text-sm">{getWeatherInfo(daily.weather_code[i]).icon}</span>
                  <p className="text-xs text-stone-600">{Math.round(daily.temperature_2m_max[i])}°</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EventCard = ({ event, dateStr, showDate, onClick }) => {
    const cat = getCategoryInfo(event.category);
    const isAllDay = event.allDay;
    const isRecurring = event.recurrence && event.recurrence !== 'none';
    
    return (
      <div 
        className={`flex items-start gap-2 p-2 rounded-xl group cursor-pointer ${isAllDay ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200' : 'bg-stone-50 hover:bg-stone-100'}`}
        onClick={() => onClick(event, dateStr)}
      >
        <div className="w-1 h-10 rounded-full" style={{ backgroundColor: cat.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span>{cat.icon}</span>
            <p className="font-semibold text-stone-800 text-sm truncate">{event.title}</p>
            {isRecurring && <span className="text-xs text-stone-400">🔄</span>}
            {event.isException && <span className="text-xs text-orange-400">✎</span>}
            {isAllDay && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">All Day</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isAllDay && <span className="text-xs text-stone-500">{formatTime(event.time)}</span>}
            {showDate && <span className="text-xs text-stone-400">{new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
            <PersonBadge person={event.person} />
            {event.kid !== 'None' && <KidBadge kid={event.kid} />}
          </div>
        </div>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (isRecurring) {
              // For recurring, delete just this occurrence
              deleteEvent(event.id, dateStr, 'single');
            } else {
              deleteEvent(event.id);
            }
          }} 
          className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs"
        >
          ✕
        </button>
      </div>
    );
  };

  const KidSection = ({ name, data }) => {
    const kidKey = name.toLowerCase(); 
    const dayData = data?.[selectedDayIndex] || { location: 'No Daycare', dropoff: '', pickup: '', caregiver: 'Chris', caregiverOther: '' }; 
    const isNoDaycare = dayData.location === 'No Daycare';
    
    const [localCaregiverOther, setLocalCaregiverOther] = useState(dayData.caregiverOther || '');
    
    useEffect(() => {
      setLocalCaregiverOther(dayData.caregiverOther || '');
    }, [dayData.caregiverOther, selectedDayIndex]);
    
    const getCaregiverDisplay = () => {
      if (dayData.caregiver === 'Other' && dayData.caregiverOther) {
        return dayData.caregiverOther;
      }
      return dayData.caregiver || 'Chris';
    };

    const handleCaregiverOtherChange = (value) => {
      setLocalCaregiverOther(value);
    };

    const handleCaregiverOtherBlur = () => {
      updateKidDay(kidKey, selectedDayIndex, 'caregiverOther', localCaregiverOther);
    };
    
    return (
      <div className={`rounded-2xl p-4 border ${name === 'Camilla' ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-100' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100'}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${name === 'Camilla' ? 'bg-pink-200' : 'bg-emerald-200'}`}>
            {name === 'Camilla' ? '👧' : '👦'}
          </div>
          <h3 className="font-bold text-stone-800">{name}</h3>
          {isNoDaycare && (
            <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full text-stone-600">
              with {getCaregiverDisplay()}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <div className="bg-white/70 rounded-xl p-2">
            <label className="text-xs text-stone-500">Location</label>
            <select 
              value={dayData.location} 
              onChange={(e) => updateKidDay(kidKey, selectedDayIndex, 'location', e.target.value)} 
              className="w-full mt-1 px-2 py-1.5 rounded-lg border-0 bg-white text-sm font-medium"
            >
              {locations.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          
          {isNoDaycare ? (
            <div className="bg-white/70 rounded-xl p-2">
              <label className="text-xs text-stone-500">Who's looking after {name}?</label>
              <div className="mt-1">
                {dayData.caregiver === 'Other' ? (
                  <div className="space-y-1">
                    <input 
                      type="text" 
                      placeholder="e.g., Grandma, Babysitter..." 
                      value={localCaregiverOther} 
                      onChange={(e) => handleCaregiverOtherChange(e.target.value)}
                      onBlur={handleCaregiverOtherBlur}
                      className="w-full px-2 py-1.5 rounded-lg border border-stone-200 text-sm" 
                    />
                    <button 
                      onClick={() => {
                        updateKidDay(kidKey, selectedDayIndex, 'caregiver', 'Chris');
                        updateKidDay(kidKey, selectedDayIndex, 'caregiverOther', '');
                      }} 
                      className="text-xs text-amber-600"
                    >
                      ← Back to list
                    </button>
                  </div>
                ) : (
                  <select 
                    value={dayData.caregiver || 'Chris'} 
                    onChange={(e) => updateKidDay(kidKey, selectedDayIndex, 'caregiver', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border-0 bg-white text-sm font-medium"
                  >
                    {caregiverOptions.map(c => (
                      <option key={c} value={c}>{c === 'Other' ? 'Other...' : c}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/70 rounded-xl p-2">
                <label className="text-xs text-stone-500">Drop-off</label>
                <select 
                  value={dayData.dropoff} 
                  onChange={(e) => updateKidDay(kidKey, selectedDayIndex, 'dropoff', e.target.value)} 
                  className="w-full mt-1 px-2 py-1.5 rounded-lg border-0 bg-white text-sm font-medium"
                >
                  {people.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="bg-white/70 rounded-xl p-2">
                <label className="text-xs text-stone-500">Pick-up</label>
                <select 
                  value={dayData.pickup} 
                  onChange={(e) => updateKidDay(kidKey, selectedDayIndex, 'pickup', e.target.value)} 
                  className="w-full mt-1 px-2 py-1.5 rounded-lg border-0 bg-white text-sm font-medium"
                >
                  {people.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getDaysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d) => { const day = new Date(d.getFullYear(), d.getMonth(), 1).getDay(); return day === 0 ? 6 : day - 1; };

  if (isLoading) return <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50 flex items-center justify-center"><div className="text-center"><div className="text-4xl mb-4 animate-bounce">🏠</div><p className="text-stone-500 font-medium">Loading Family HQ...</p></div></div>;

  const CalendarView = () => {
    const daysInMonth = getDaysInMonth(currentMonth); 
    const firstDay = getFirstDayOfMonth(currentMonth);
    const calendarDays = [...Array(firstDay).fill(null), ...Array(daysInMonth).fill(null).map((_, i) => i + 1)];
    
    const getDateString = (day) => {
      if (!day) return null;
      return formatDateLocal(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    };
    
    const todayStr = getTodayStr();
    const isTodayCell = (day) => day && getDateString(day) === todayStr;
    
    const getUpcomingEvents = () => { 
      const events = []; 
      for (let i = 0; i < 30; i++) { 
        const d = new Date(); 
        d.setDate(d.getDate() + i); 
        const ds = formatDateLocal(d); 
        getEventsForDate(ds).forEach(e => events.push({ ...e, displayDate: ds })); 
      } 
      return events; 
    };

    return (
      <div className="space-y-4 pb-20">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-stone-800">📅 Calendar</h2>
          <div className="flex gap-1 bg-stone-100 p-1 rounded-xl"><button onClick={() => setCalendarView('month')} className={`px-3 py-1 rounded-lg text-xs font-medium ${calendarView === 'month' ? 'bg-white shadow-sm' : ''}`}>Month</button><button onClick={() => setCalendarView('list')} className={`px-3 py-1 rounded-lg text-xs font-medium ${calendarView === 'list' ? 'bg-white shadow-sm' : ''}`}>List</button></div>
        </div>
        {calendarView === 'month' ? <>
          <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-stone-100">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="w-8 h-8 rounded-full bg-stone-100">‹</button>
            <h3 className="font-bold text-stone-800">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="w-8 h-8 rounded-full bg-stone-100">›</button>
          </div>
          <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
            <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-100">{['M','T','W','T','F','S','S'].map((d,i) => <div key={i} className="py-2 text-center text-xs font-semibold text-stone-500">{d}</div>)}</div>
            <div className="grid grid-cols-7">{calendarDays.map((day, i) => {
              const dateStr = getDateString(day); 
              const events = dateStr ? getEventsForDate(dateStr) : [];
              return <div key={i} onClick={() => day && setSelectedCalendarDate(dateStr)} className={`min-h-[52px] p-1 border-b border-r border-stone-100 cursor-pointer ${!day ? 'bg-stone-50' : selectedCalendarDate === dateStr ? 'bg-amber-50' : 'hover:bg-stone-50'}`}>
                {day && <><div className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${isTodayCell(day) ? 'bg-amber-500 text-white' : ''}`}>{day}</div>
                <div className="space-y-0.5">{events.slice(0,2).map((e,j) => <div key={j} className={`text-white px-1 rounded truncate ${e.allDay ? 'font-semibold' : ''}`} style={{ backgroundColor: getCategoryInfo(e.category).color, fontSize: 9 }}>{e.allDay ? '● ' : ''}{e.title}</div>)}{events.length > 2 && <div className="text-stone-400" style={{ fontSize: 9 }}>+{events.length-2}</div>}</div></>}
              </div>;
            })}</div>
          </div>
          {selectedCalendarDate && <div className="bg-white rounded-xl p-4 border border-stone-100">
            <div className="flex items-center justify-between mb-3"><h4 className="font-bold text-stone-800 text-sm">{new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</h4><button onClick={() => openModal('event', selectedCalendarDate)} className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs">+ Add</button></div>
            {getEventsForDate(selectedCalendarDate).length === 0 ? <p className="text-stone-400 text-sm text-center py-3">No events</p> : <div className="space-y-2">{getEventsForDate(selectedCalendarDate).map((e,i) => <EventCard key={i} event={e} dateStr={selectedCalendarDate} onClick={openEditModal} />)}</div>}
          </div>}
          <div className="flex flex-wrap gap-2">{eventCategories.map(c => <div key={c.id} className="flex items-center gap-1 text-xs"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></div>{c.label}</div>)}</div>
        </> : <>
          <button onClick={() => openModal('event')} className="w-full py-3 rounded-xl border-2 border-dashed border-stone-200 text-stone-500 text-sm hover:border-amber-300">+ Add New Event</button>
          <div className="space-y-2">{getUpcomingEvents().length === 0 ? <p className="text-stone-400 text-center py-8">No upcoming events</p> : getUpcomingEvents().map((e,i) => <EventCard key={i} event={e} dateStr={e.displayDate} showDate onClick={openEditModal} />)}</div>
        </>}
      </div>
    );
  };

  const DashboardView = () => {
    const todayStr = getTodayStr();
    const isCurrentWeek = weekDates.includes(todayStr);
    
    return (
      <div className="space-y-4 pb-20">
        {/* Week Navigation */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-stone-800">{days[selectedDayIndex]}</h2>
              <p className="text-xs text-stone-500">{formatDisplayDate(selectedDate)}</p>
            </div>
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              {isOnline ? 'Synced' : 'Offline'}
            </span>
          </div>
          
          {/* Week Selector */}
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={goToPreviousWeek}
              className="w-8 h-8 rounded-full bg-white text-stone-600 flex items-center justify-center"
            >
              ‹
            </button>
            <p className="text-xs font-medium text-stone-600">{formatWeekLabel()}</p>
            <button 
              onClick={goToNextWeek}
              className="w-8 h-8 rounded-full bg-white text-stone-600 flex items-center justify-center"
            >
              ›
            </button>
          </div>
          
          {/* Day Buttons */}
          <div className="flex gap-1">
            {weekDates.map((dateStr, i) => {
              const isCurrentDay = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <button 
                  key={dateStr} 
                  onClick={() => setSelectedDate(dateStr)} 
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                    isSelected 
                      ? 'bg-amber-500 text-white shadow-md' 
                      : isCurrentDay 
                        ? 'bg-amber-200 text-amber-800' 
                        : 'bg-white text-stone-600'
                  }`}
                >
                  {shortDays[i]}
                </button>
              );
            })}
          </div>
          
          {/* Back to Today button */}
          {selectedDate !== todayStr && (
            <button 
              onClick={goToToday} 
              className="w-full mt-2 py-1.5 text-xs text-amber-600 font-medium hover:text-amber-700"
            >
              ← Back to Today
            </button>
          )}
        </div>

        {/* Weather Widget - only show for current week */}
        {isCurrentWeek && <WeatherWidget />}

        {/* Schedule */}
        <div className="bg-white rounded-2xl p-4 border border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800">📅 Schedule</h3>
            <div className="flex gap-2">
              <button onClick={() => openModal('event', selectedDate)} className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm">+</button>
              <button onClick={() => setCurrentView('calendar')} className="text-xs text-amber-600 font-medium">Calendar →</button>
            </div>
          </div>
          {getEventsForDate(selectedDate).length === 0 
            ? <p className="text-stone-400 text-sm py-3 text-center">No events — tap + to add</p> 
            : <div className="space-y-2">{getEventsForDate(selectedDate).map((e,i) => <EventCard key={i} event={e} dateStr={selectedDate} onClick={openEditModal} />)}</div>
          }
        </div>

        <KidSection name="Camilla" data={weekData.kids.camilla} />
        <KidSection name="Asher" data={weekData.kids.asher} />
        
        {/* Dinner - Date based */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-stone-800">🍽️ Dinner</h3>
            <button onClick={() => openModal('meal', selectedDate)} className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-bold">+</button>
          </div>
          {getMealForDate(selectedDate) ? (
            <div className="bg-white/70 rounded-xl p-3 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-stone-800">{getMealForDate(selectedDate).meal}</p>
                  <p className="text-xs text-stone-500 mt-1">Chef: <PersonBadge person={getMealForDate(selectedDate).prep} /></p>
                </div>
                <button 
                  onClick={() => deleteMeal(getMealForDate(selectedDate).id)} 
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-red-100 text-red-500 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <p className="text-stone-400 text-sm py-3 text-center bg-white/50 rounded-xl">No dinner planned</p>
          )}
        </div>
        
        {/* Chores - Date based with per-date completion */}
        <div className="bg-white rounded-2xl p-4 border border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800">✨ Chores</h3>
            <button onClick={() => openModal('chore')} className="w-7 h-7 rounded-full bg-stone-100 text-stone-600 font-bold">+</button>
          </div>
          {getChoresForDate(selectedDate).length === 0 ? (
            <p className="text-stone-400 text-sm py-3 text-center">No chores! 🎉</p>
          ) : (
            <div className="space-y-2">
              {getChoresForDate(selectedDate).map(c => {
                const repeatLabel = getChoreRepeatLabel(c);
                const isCompleted = isChoreCompletedForDate(c.id, selectedDate);
                return (
                  <div 
                    key={c.id} 
                    className={`flex items-center gap-2 p-2 rounded-xl group cursor-pointer ${isCompleted ? 'bg-emerald-50' : 'bg-stone-50'}`}
                    onClick={() => openEditChoreModal(c)}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleChoreForDate(c.id, selectedDate); }} 
                      className={`w-5 h-5 rounded-full border-2 text-xs flex-shrink-0 ${isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300'}`}
                    >
                      {isCompleted && '✓'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-sm ${isCompleted ? 'line-through text-stone-400' : ''}`}>{c.task}</span>
                        {repeatLabel && (
                          <span className="text-xs text-stone-400">🔄</span>
                        )}
                      </div>
                      {repeatLabel && (
                        <span className="text-xs text-stone-400">{repeatLabel}</span>
                      )}
                    </div>
                    <PersonBadge person={c.person} />
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteChore(c.id); }} 
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const GroceryView = () => (
    <div className="space-y-3 pb-20">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-stone-800">🛒 Grocery</h2><button onClick={() => openModal('grocery')} className="px-3 py-1.5 rounded-full bg-blue-500 text-white text-xs">+ Add</button></div>
      <div className="bg-white rounded-xl border border-stone-100">{(weekData.grocery || []).length === 0 ? <p className="text-stone-400 text-sm py-8 text-center">No items</p> : (weekData.grocery || []).map((g, i) => <div key={g.id} className={`flex items-center gap-2 p-3 group ${i < weekData.grocery.length - 1 ? 'border-b border-stone-100' : ''} ${g.done ? 'bg-emerald-50' : ''}`}><button onClick={() => toggleGrocery(g.id)} className={`w-5 h-5 rounded-full border-2 text-xs ${g.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300'}`}>{g.done && '✓'}</button><span className={`flex-1 text-sm ${g.done ? 'line-through text-stone-400' : ''}`}>{g.item}</span><button onClick={() => deleteGroceryItem(g.id)} className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs">✕</button></div>)}</div>
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
    
    const goToPrevMealWeek = () => {
      const current = new Date(mealWeekStart + 'T00:00:00');
      current.setDate(current.getDate() - 7);
      setMealWeekStart(formatDateLocal(current));
    };
    
    const goToNextMealWeek = () => {
      const current = new Date(mealWeekStart + 'T00:00:00');
      current.setDate(current.getDate() + 7);
      setMealWeekStart(formatDateLocal(current));
    };
    
    const formatMealWeekLabel = () => {
      const start = new Date(mealWeekDates[0] + 'T00:00:00');
      const end = new Date(mealWeekDates[6] + 'T00:00:00');
      return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`;
    };
    
    return (
      <div className="space-y-3 pb-20">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-800">🍽️ Meals</h2>
          <button onClick={() => openModal('meal', selectedDate)} className="px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs">+ Add</button>
        </div>
        
        {/* Week navigation for meals */}
        <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-stone-100">
          <button onClick={goToPrevMealWeek} className="w-8 h-8 rounded-full bg-stone-100">‹</button>
          <span className="text-sm font-medium text-stone-700">{formatMealWeekLabel()}</span>
          <button onClick={goToNextMealWeek} className="w-8 h-8 rounded-full bg-stone-100">›</button>
        </div>
        
        {mealWeekDates.map((dateStr, i) => {
          const meal = getMealForDate(dateStr);
          const dayName = days[getDayIndexFromDate(dateStr)];
          const dateDisplay = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
          const isTodayMeal = dateStr === getTodayStr();
          
          return (
            <div 
              key={dateStr} 
              className={`bg-white rounded-xl p-3 border flex items-center justify-between group ${isTodayMeal ? 'border-amber-300 bg-amber-50' : 'border-stone-100'}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-stone-700 text-sm">{dayName}</h3>
                  <span className="text-xs text-stone-400">{dateDisplay}</span>
                  {isTodayMeal && <span className="text-xs bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full">Today</span>}
                </div>
                {meal ? (
                  <>
                    <p className="text-sm mt-1">{meal.meal}</p>
                    <p className="text-xs text-stone-500">Chef: <PersonBadge person={meal.prep} /></p>
                  </>
                ) : (
                  <p className="text-xs text-stone-400 mt-1">No meal planned</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {meal ? (
                  <button 
                    onClick={() => deleteMeal(meal.id)} 
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-red-100 text-red-500 text-xs"
                  >
                    ✕
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setNewItem(prev => ({ ...prev, date: dateStr }));
                      openModal('meal', dateStr);
                    }}
                    className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold"
                  >
                    +
                  </button>
                )}
                <span className="text-2xl">{meal ? '🍲' : '❓'}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const WhoSelector = () => (
    <div>
      <label className="text-xs text-stone-500">Who</label>
      {newItem.person === 'Other' ? (
        <div className="space-y-1">
          <input type="text" placeholder="Enter name..." value={newItem.personOther} onChange={e => setNewItem(p => ({ ...p, personOther: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />
          <button onClick={() => setNewItem(p => ({ ...p, person: 'Chris', personOther: '' }))} className="text-xs text-amber-600">← Back</button>
        </div>
      ) : (
        <select value={newItem.person} onChange={e => setNewItem(p => ({ ...p, person: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm">
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
        <label className="text-xs text-stone-500">Repeats</label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setNewItem(p => ({ ...p, choreDays: [] }))}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border ${
                !hasRepeatDays ? 'bg-amber-50 border-amber-400 text-amber-700' : 'border-stone-200 text-stone-600'
              }`}
            >
              One-time
            </button>
            <button
              onClick={() => setNewItem(p => ({ ...p, choreDays: [getDayIndexFromDate(p.date)] }))}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border ${
                hasRepeatDays ? 'bg-amber-50 border-amber-400 text-amber-700' : 'border-stone-200 text-stone-600'
              }`}
            >
              Repeating
            </button>
          </div>
          
          {hasRepeatDays && (
            <div className="bg-stone-50 rounded-xl p-3">
              <p className="text-xs text-stone-500 mb-2">Select days to repeat:</p>
              <div className="flex gap-1">
                {dayLetters.map((letter, index) => (
                  <button
                    key={index}
                    onClick={() => toggleChoreDay(index)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      newItem.choreDays.includes(index)
                        ? 'bg-amber-500 text-white'
                        : 'bg-white text-stone-600 border border-stone-200'
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setNewItem(p => ({ ...p, choreDays: [0, 1, 2, 3, 4, 5, 6] }))}
                  className="text-xs text-amber-600 hover:text-amber-700"
                >
                  Every day
                </button>
                <span className="text-stone-300">|</span>
                <button
                  onClick={() => setNewItem(p => ({ ...p, choreDays: [0, 1, 2, 3, 4] }))}
                  className="text-xs text-amber-600 hover:text-amber-700"
                >
                  Weekdays
                </button>
                <span className="text-stone-300">|</span>
                <button
                  onClick={() => setNewItem(p => ({ ...p, choreDays: [5, 6] }))}
                  className="text-xs text-amber-600 hover:text-amber-700"
                >
                  Weekends
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Series edit choice dialog
  const SeriesEditChoice = () => (
    <div className="space-y-3">
      <p className="text-sm text-stone-600 text-center">This is a recurring event. What would you like to edit?</p>
      <button
        onClick={() => proceedWithEventEdit(editingEvent, editingEvent.editDate, 'single')}
        className="w-full py-3 rounded-xl bg-amber-100 text-amber-700 font-medium text-sm"
      >
        ✏️ Just this occurrence
      </button>
      <button
        onClick={() => proceedWithEventEdit(editingEvent, editingEvent.editDate, 'all')}
        className="w-full py-3 rounded-xl bg-stone-100 text-stone-700 font-medium text-sm"
      >
        🔄 All occurrences
      </button>
      <button
        onClick={closeModal}
        className="w-full py-2 text-stone-500 text-sm"
      >
        Cancel
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-stone-100 px-4 py-3"><div className="max-w-md mx-auto flex items-center justify-between"><div><h1 className="text-lg font-extrabold text-stone-800">Family HQ 🏠</h1><p className="text-xs text-stone-500">{formatWeekLabel()}</p></div><button onClick={() => window.print()} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs">🖨️ Print</button></div></header>
      <main className="max-w-md mx-auto px-4 py-4">{currentView === 'dashboard' && <DashboardView />}{currentView === 'calendar' && <CalendarView />}{currentView === 'meals' && <MealsView />}{currentView === 'grocery' && <GroceryView />}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-stone-100 px-4 py-2 pb-4"><div className="flex justify-around max-w-md mx-auto"><NavButton view="dashboard" icon="📋" label="Today" /><NavButton view="calendar" icon="📅" label="Calendar" /><NavButton view="meals" icon="🍽️" label="Meals" /><NavButton view="grocery" icon="🛒" label="Grocery" /></div></nav>
      
      {showAddModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={closeModal}><div className="bg-white w-full max-w-md rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-stone-800">
            {editSeriesMode === 'choosing' ? '🔄 Edit Recurring Event' :
             modalType === 'event' ? (editingEvent ? (editSeriesMode === 'single' ? '✏️ Edit This Occurrence' : '✏️ Edit All Occurrences') : '📅 Add Event') : 
             modalType === 'meal' ? '🍽️ Add Meal' : 
             modalType === 'chore' ? (editingChore ? '✏️ Edit Chore' : '✨ Add Chore') : 
             '🛒 Add Item'}
          </h3>
          <button onClick={closeModal} className="w-7 h-7 rounded-full bg-stone-100 text-stone-500">✕</button>
        </div>
        
        {editSeriesMode === 'choosing' ? (
          <SeriesEditChoice />
        ) : (
          <div className="space-y-3">
            {modalType === 'event' && <>
              <input type="text" placeholder="Event title" value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />
              
              <div className="flex items-center justify-between bg-stone-50 rounded-xl p-3">
                <span className="text-sm text-stone-700">All Day Event</span>
                <button 
                  onClick={() => setNewItem(p => ({ ...p, allDay: !p.allDay }))}
                  className={`w-12 h-6 rounded-full transition-colors ${newItem.allDay ? 'bg-purple-500' : 'bg-stone-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${newItem.allDay ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-stone-500">Date</label><input type="date" value={newItem.date} onChange={e => setNewItem(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" disabled={editSeriesMode === 'single'} /></div>
                {!newItem.allDay && (
                  <div><label className="text-xs text-stone-500">Time</label><input type="time" value={newItem.time} onChange={e => setNewItem(p => ({ ...p, time: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" /></div>
                )}
              </div>
              <div><label className="text-xs text-stone-500">Category</label><div className="grid grid-cols-3 gap-2 mt-1">{eventCategories.map(c => <button key={c.id} onClick={() => setNewItem(p => ({ ...p, category: c.id }))} className={`flex items-center gap-1 px-2 py-2 rounded-xl border text-xs ${newItem.category === c.id ? 'border-amber-400 bg-amber-50' : 'border-stone-200'}`}><span>{c.icon}</span>{c.label}</button>)}</div></div>
              {editSeriesMode !== 'single' && (
                <div><label className="text-xs text-stone-500">Repeats</label><select value={newItem.recurrence} onChange={e => setNewItem(p => ({ ...p, recurrence: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm mt-1">{recurrenceOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <WhoSelector />
                <div><label className="text-xs text-stone-500">Kid</label><select value={newItem.kid} onChange={e => setNewItem(p => ({ ...p, kid: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm"><option>Camilla</option><option>Asher</option><option>Both</option><option>None</option></select></div>
              </div>
              {editingEvent && (
                <button 
                  onClick={() => { 
                    if (editSeriesMode === 'single') {
                      deleteEvent(editingEvent.id, editingEvent.editDate, 'single');
                    } else {
                      deleteEvent(editingEvent.id);
                    }
                    closeModal();
                  }} 
                  className="w-full py-2 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50"
                >
                  🗑️ {editSeriesMode === 'single' ? 'Delete This Occurrence' : 'Delete All Occurrences'}
                </button>
              )}
            </>}
            {modalType === 'meal' && <>
              <div className="bg-stone-50 rounded-xl p-3 mb-2">
                <p className="text-sm text-stone-600">Planning meal for: <span className="font-semibold">{new Date(newItem.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</span></p>
              </div>
              <input type="text" placeholder="What's for dinner?" value={newItem.meal} onChange={e => setNewItem(p => ({ ...p, meal: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-stone-500">Chef</label>
                  <select value={newItem.prep} onChange={e => setNewItem(p => ({ ...p, prep: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm">{people.map(p => <option key={p}>{p}</option>)}</select>
                </div>
                <div>
                  <label className="text-xs text-stone-500">Date</label>
                  <input type="date" value={newItem.date} onChange={e => setNewItem(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />
                </div>
              </div>
            </>}
            {modalType === 'chore' && <>
              <input type="text" placeholder="What needs doing?" value={newItem.task} onChange={e => setNewItem(p => ({ ...p, task: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <WhoSelector />
                <div>
                  <label className="text-xs text-stone-500">Date</label>
                  <input type="date" value={newItem.date} onChange={e => setNewItem(p => ({ ...p, date: e.target.value, day: getDayIndexFromDate(e.target.value) }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />
                </div>
              </div>
              <ChoreDayPicker />
              {editingChore && (
                <button 
                  onClick={() => { deleteChore(editingChore.id); closeModal(); }} 
                  className="w-full py-2 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50"
                >
                  🗑️ Delete Chore
                </button>
              )}
            </>}
            {modalType === 'grocery' && <input type="text" placeholder="Add item..." value={newItem.item} onChange={e => setNewItem(p => ({ ...p, item: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addItem()} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />}
            <button onClick={addItem} className={`w-full py-3 rounded-xl text-white font-semibold text-sm ${modalType === 'event' ? 'bg-amber-500' : modalType === 'meal' ? 'bg-orange-500' : modalType === 'chore' ? 'bg-stone-600' : 'bg-blue-500'}`}>
              {editingEvent || editingChore ? 'Save Changes' : 'Add'}
            </button>
          </div>
        )}
      </div></div>}
    </div>
  );
}
