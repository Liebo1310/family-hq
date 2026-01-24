import React, { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, onValue, set } from 'firebase/database';

export default function FamilyHQ() {
  // Get current day index (Monday = 0, Sunday = 6) using local timezone
  const getTodayIndex = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return day === 0 ? 6 : day - 1; // Convert to Monday = 0
  };

  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDay, setSelectedDay] = useState(getTodayIndex());
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0 = this week, 1 = next week, etc.
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('event');
  const [editingEvent, setEditingEvent] = useState(null); // For editing existing events
  const [calendarView, setCalendarView] = useState('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const locations = ['Little Palace', 'Cronulla Pre-School', 'No Daycare'];
  const people = ['Chris', 'Alex', 'Both'];
  const familyMembers = ['Camilla', 'Asher', 'Chris', 'Alex'];
  
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

  // Get the Monday of a specific week (0 = this week, 1 = next week, etc.)
  const getWeekStart = (weekOffset = 0) => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) + (weekOffset * 7);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff);
    return monday;
  };
  
  const weekStartDate = getWeekStart(selectedWeekOffset);
  
  // Get date for a specific day index (0 = Monday) in the selected week
  const getDateForDay = (dayIndex, weekOffset = selectedWeekOffset) => {
    const monday = getWeekStart(weekOffset);
    const d = new Date(monday);
    d.setDate(d.getDate() + dayIndex);
    return d;
  };

  // Format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get the date for selected day
  const getSelectedDayDate = () => {
    const date = getDateForDay(selectedDay);
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatWeekLabel = () => {
    const start = weekStartDate;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    if (selectedWeekOffset === 0) {
      return `This Week (${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })})`;
    } else if (selectedWeekOffset === 1) {
      return `Next Week (${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })})`;
    } else {
      return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`;
    }
  };

  // Check if we're viewing the current week and current day
  const isViewingToday = () => selectedWeekOffset === 0 && selectedDay === getTodayIndex();

  // Fetch weather for Sydney/Cronulla area
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
    kids: {
      camilla: Array(7).fill(null).map((_, i) => ({ day: i, location: i < 5 ? 'Little Palace' : 'No Daycare', dropoff: 'Chris', pickup: 'Alex' })),
      asher: Array(7).fill(null).map((_, i) => ({ day: i, location: i < 5 ? 'Little Palace' : 'No Daycare', dropoff: 'Alex', pickup: 'Chris' }))
    },
    meals: [],
    lunches: Array(7).fill(null).map((_, i) => ({ day: i, camilla: '', asher: '', chris: '', alex: '' })),
    chores: [],
    grocery: []
  };

  const [weekData, setWeekData] = useState(defaultData);
  const [newItem, setNewItem] = useState({ title: '', time: '09:00', person: 'Chris', personOther: '', kid: 'Camilla', day: 0, meal: '', prep: 'Chris', task: '', item: '', date: formatDateLocal(new Date()), category: 'kids', recurrence: 'none', allDay: false });

  // Firebase sync
  useEffect(() => {
    const dataRef = ref(database, 'familyData');
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setWeekData({ ...defaultData, ...data, kids: { camilla: data.kids?.camilla || defaultData.kids.camilla, asher: data.kids?.asher || defaultData.kids.asher }, lunches: data.lunches || defaultData.lunches });
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
    
    const daysDiff = Math.floor((targetDate - eventDate) / (1000 * 60 * 60 * 24));
    
    if (event.recurrence === 'none') return daysDiff === 0;
    if (event.recurrence === 'weekly') return daysDiff % 7 === 0;
    if (event.recurrence === 'fortnightly') return daysDiff % 14 === 0;
    if (event.recurrence === 'monthly') return eventDate.getDate() === targetDate.getDate();
    return daysDiff === 0;
  };

  // Sort events: all-day events first, then by time
  const getEventsForDate = (dateStr) => {
    const events = (weekData.calendarEvents || []).filter(e => eventOccursOnDate(e, dateStr));
    return events.sort((a, b) => {
      // All-day events come first
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      // Then sort by time
      return (a.time || '').localeCompare(b.time || '');
    });
  };
  
  const getEventsForDay = (dayIndex) => {
    const date = getDateForDay(dayIndex);
    const dateStr = formatDateLocal(date);
    return getEventsForDate(dateStr);
  };

  const formatTime = (t) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; };
  const getCategoryInfo = (id) => eventCategories.find(c => c.id === id) || eventCategories[4];

  const updateKidDay = (kid, day, field, value) => { const newData = { ...weekData, kids: { ...weekData.kids, [kid]: weekData.kids[kid].map((d, i) => i === day ? { ...d, [field]: value } : d) } }; setWeekData(newData); saveToFirebase(newData); };
  const updateLunch = (day, person, value) => { const newData = { ...weekData, lunches: weekData.lunches.map((l, i) => i === day ? { ...l, [person.toLowerCase()]: value } : l) }; setWeekData(newData); saveToFirebase(newData); };
  const toggleChore = (id) => { const newData = { ...weekData, chores: weekData.chores.map(c => c.id === id ? { ...c, done: !c.done } : c) }; setWeekData(newData); saveToFirebase(newData); };
  const toggleGrocery = (id) => { const newData = { ...weekData, grocery: weekData.grocery.map(g => g.id === id ? { ...g, done: !g.done } : g) }; setWeekData(newData); saveToFirebase(newData); };
  const deleteEvent = (id) => { const newData = { ...weekData, calendarEvents: weekData.calendarEvents.filter(e => e.id !== id) }; setWeekData(newData); saveToFirebase(newData); };
  const deleteChore = (id) => { const newData = { ...weekData, chores: weekData.chores.filter(c => c.id !== id) }; setWeekData(newData); saveToFirebase(newData); };
  const deleteGroceryItem = (id) => { const newData = { ...weekData, grocery: weekData.grocery.filter(g => g.id !== id) }; setWeekData(newData); saveToFirebase(newData); };

  const openModal = (type, presetDate = null) => { 
    setModalType(type);
    setEditingEvent(null);
    const dateStr = presetDate || formatDateLocal(getDateForDay(selectedDay));
    setNewItem({ title: '', time: '09:00', person: 'Chris', personOther: '', kid: 'Camilla', day: selectedDay, meal: '', prep: 'Chris', task: '', item: '', date: dateStr, category: 'kids', recurrence: 'none', allDay: false }); 
    setShowAddModal(true); 
  };

  // Open modal to edit an existing event
  const openEditModal = (event) => {
    setModalType('event');
    setEditingEvent(event);
    const isOtherPerson = !people.includes(event.person);
    setNewItem({
      title: event.title,
      time: event.time || '09:00',
      person: isOtherPerson ? 'Other' : event.person,
      personOther: isOtherPerson ? event.person : '',
      kid: event.kid,
      day: selectedDay,
      meal: '',
      prep: 'Chris',
      task: '',
      item: '',
      date: event.date,
      category: event.category,
      recurrence: event.recurrence,
      allDay: event.allDay || false
    });
    setShowAddModal(true);
  };

  const addItem = () => {
    const finalPerson = newItem.person === 'Other' ? newItem.personOther : newItem.person;
    let newData = { ...weekData };
    
    if (modalType === 'event' && newItem.title) {
      if (editingEvent) {
        // Update existing event
        newData.calendarEvents = weekData.calendarEvents.map(e => 
          e.id === editingEvent.id 
            ? { ...e, date: newItem.date, time: newItem.allDay ? null : newItem.time, title: newItem.title, person: finalPerson, kid: newItem.kid, category: newItem.category, recurrence: newItem.recurrence, allDay: newItem.allDay }
            : e
        );
      } else {
        // Add new event
        const id = Date.now();
        newData.calendarEvents = [...(weekData.calendarEvents || []), { id, date: newItem.date, time: newItem.allDay ? null : newItem.time, title: newItem.title, person: finalPerson, kid: newItem.kid, category: newItem.category, recurrence: newItem.recurrence, allDay: newItem.allDay }];
      }
    } else if (modalType === 'meal' && newItem.meal) {
      const id = Date.now();
      newData.meals = [...(weekData.meals || []).filter(m => m.day !== newItem.day), { id, day: newItem.day, meal: newItem.meal, prep: newItem.prep }];
    } else if (modalType === 'chore' && newItem.task) {
      const id = Date.now();
      newData.chores = [...(weekData.chores || []), { id, day: newItem.day, task: newItem.task, person: finalPerson, done: false }];
    } else if (modalType === 'grocery' && newItem.item) {
      const id = Date.now();
      newData.grocery = [...(weekData.grocery || []), { id, item: newItem.item, done: false }];
    }
    
    setWeekData(newData); 
    saveToFirebase(newData);
    setNewItem({ title: '', time: '09:00', person: 'Chris', personOther: '', kid: 'Camilla', day: selectedDay, meal: '', prep: 'Chris', task: '', item: '', date: formatDateLocal(new Date()), category: 'kids', recurrence: 'none', allDay: false });
    setShowAddModal(false); 
    setSelectedCalendarDate(null);
    setEditingEvent(null);
  };

  const getMealForDay = (day) => (weekData.meals || []).find(m => m.day === day);
  const getChoresForDay = (day) => (weekData.chores || []).filter(c => c.day === day);
  const getLunchForDay = (day) => weekData.lunches?.[day] || {};

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

  // Clickable Event Card that opens edit modal
  const EventCard = ({ event, showDate, onClick }) => {
    const cat = getCategoryInfo(event.category);
    const isAllDay = event.allDay;
    
    return (
      <div 
        className={`flex items-start gap-2 p-2 rounded-xl group cursor-pointer ${isAllDay ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200' : 'bg-stone-50 hover:bg-stone-100'}`}
        onClick={() => onClick ? onClick(event) : openEditModal(event)}
      >
        <div className="w-1 h-10 rounded-full" style={{ backgroundColor: cat.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span>{cat.icon}</span>
            <p className="font-semibold text-stone-800 text-sm truncate">{event.title}</p>
            {event.recurrence !== 'none' && <span className="text-xs text-stone-400">🔄</span>}
            {isAllDay && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">All Day</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isAllDay && <span className="text-xs text-stone-500">{formatTime(event.time)}</span>}
            {showDate && <span className="text-xs text-stone-400">{new Date(event.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
            <PersonBadge person={event.person} />
            {event.kid !== 'None' && <KidBadge kid={event.kid} />}
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }} 
          className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs"
        >
          ✕
        </button>
      </div>
    );
  };

  const KidSection = ({ name, data }) => {
    const kidKey = name.toLowerCase(); const dayData = data?.[selectedDay] || { location: 'No Daycare', dropoff: '', pickup: '' }; const isNoDaycare = dayData.location === 'No Daycare';
    return (
      <div className={`rounded-2xl p-4 border ${name === 'Camilla' ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-100' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100'}`}>
        <div className="flex items-center gap-2 mb-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center ${name === 'Camilla' ? 'bg-pink-200' : 'bg-emerald-200'}`}>{name === 'Camilla' ? '👧' : '👦'}</div><h3 className="font-bold text-stone-800">{name}</h3></div>
        <div className="space-y-2">
          <div className="bg-white/70 rounded-xl p-2"><label className="text-xs text-stone-500">Location</label><select value={dayData.location} onChange={(e) => updateKidDay(kidKey, selectedDay, 'location', e.target.value)} className="w-full mt-1 px-2 py-1.5 rounded-lg border-0 bg-white text-sm font-medium">{locations.map(l => <option key={l}>{l}</option>)}</select></div>
          {!isNoDaycare && <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/70 rounded-xl p-2"><label className="text-xs text-stone-500">Drop-off</label><select value={dayData.dropoff} onChange={(e) => updateKidDay(kidKey, selectedDay, 'dropoff', e.target.value)} className="w-full mt-1 px-2 py-1.5 rounded-lg border-0 bg-white text-sm font-medium">{people.map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="bg-white/70 rounded-xl p-2"><label className="text-xs text-stone-500">Pick-up</label><select value={dayData.pickup} onChange={(e) => updateKidDay(kidKey, selectedDay, 'pickup', e.target.value)} className="w-full mt-1 px-2 py-1.5 rounded-lg border-0 bg-white text-sm font-medium">{people.map(p => <option key={p}>{p}</option>)}</select></div>
          </div>}
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
    
    const today = new Date();
    const isToday = (day) => day && day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
    
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
                {day && <><div className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-amber-500 text-white' : ''}`}>{day}</div>
                <div className="space-y-0.5">{events.slice(0,2).map((e,j) => <div key={j} className={`text-white px-1 rounded truncate ${e.allDay ? 'font-semibold' : ''}`} style={{ backgroundColor: getCategoryInfo(e.category).color, fontSize: 9 }}>{e.allDay ? '● ' : ''}{e.title}</div>)}{events.length > 2 && <div className="text-stone-400" style={{ fontSize: 9 }}>+{events.length-2}</div>}</div></>}
              </div>;
            })}</div>
          </div>
          {selectedCalendarDate && <div className="bg-white rounded-xl p-4 border border-stone-100">
            <div className="flex items-center justify-between mb-3"><h4 className="font-bold text-stone-800 text-sm">{new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</h4><button onClick={() => openModal('event', selectedCalendarDate)} className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs">+ Add</button></div>
            {getEventsForDate(selectedCalendarDate).length === 0 ? <p className="text-stone-400 text-sm text-center py-3">No events</p> : <div className="space-y-2">{getEventsForDate(selectedCalendarDate).map((e,i) => <EventCard key={i} event={e} onClick={openEditModal} />)}</div>}
          </div>}
          <div className="flex flex-wrap gap-2">{eventCategories.map(c => <div key={c.id} className="flex items-center gap-1 text-xs"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></div>{c.label}</div>)}</div>
        </> : <>
          <button onClick={() => openModal('event')} className="w-full py-3 rounded-xl border-2 border-dashed border-stone-200 text-stone-500 text-sm hover:border-amber-300">+ Add New Event</button>
          <div className="space-y-2">{getUpcomingEvents().length === 0 ? <p className="text-stone-400 text-center py-8">No upcoming events</p> : getUpcomingEvents().map((e,i) => <EventCard key={i} event={{...e, date: e.displayDate}} showDate onClick={openEditModal} />)}</div>
        </>}
      </div>
    );
  };

  const DashboardView = () => {
    const tomorrowIndex = (selectedDay + 1) % 7; 
    const lunch = getLunchForDay(tomorrowIndex);
    
    return (
      <div className="space-y-4 pb-20">
        {/* Week Navigation */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-stone-800">{days[selectedDay]}</h2>
              <p className="text-xs text-stone-500">{getSelectedDayDate()}</p>
            </div>
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              {isOnline ? 'Synced' : 'Offline'}
            </span>
          </div>
          
          {/* Week Selector */}
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={() => setSelectedWeekOffset(Math.max(0, selectedWeekOffset - 1))}
              disabled={selectedWeekOffset === 0}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedWeekOffset === 0 ? 'bg-stone-100 text-stone-300' : 'bg-white text-stone-600'}`}
            >
              ‹
            </button>
            <p className="text-xs font-medium text-stone-600">{formatWeekLabel()}</p>
            <button 
              onClick={() => setSelectedWeekOffset(selectedWeekOffset + 1)}
              className="w-8 h-8 rounded-full bg-white text-stone-600 flex items-center justify-center"
            >
              ›
            </button>
          </div>
          
          {/* Day Buttons */}
          <div className="flex gap-1">
            {shortDays.map((d, i) => {
              const isCurrentDay = selectedWeekOffset === 0 && i === getTodayIndex();
              return (
                <button 
                  key={d} 
                  onClick={() => setSelectedDay(i)} 
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                    selectedDay === i 
                      ? 'bg-amber-500 text-white shadow-md' 
                      : isCurrentDay 
                        ? 'bg-amber-200 text-amber-800' 
                        : 'bg-white text-stone-600'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          
          {/* Back to Today button */}
          {!isViewingToday() && (
            <button 
              onClick={() => { setSelectedWeekOffset(0); setSelectedDay(getTodayIndex()); }} 
              className="w-full mt-2 py-1.5 text-xs text-amber-600 font-medium hover:text-amber-700"
            >
              ← Back to Today
            </button>
          )}
        </div>

        {/* Weather Widget - only show for current week */}
        {selectedWeekOffset === 0 && <WeatherWidget />}

        {/* Schedule */}
        <div className="bg-white rounded-2xl p-4 border border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800">📅 Schedule</h3>
            <div className="flex gap-2">
              <button onClick={() => openModal('event', formatDateLocal(getDateForDay(selectedDay)))} className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm">+</button>
              <button onClick={() => setCurrentView('calendar')} className="text-xs text-amber-600 font-medium">Calendar →</button>
            </div>
          </div>
          {getEventsForDay(selectedDay).length === 0 
            ? <p className="text-stone-400 text-sm py-3 text-center">No events — tap + to add</p> 
            : <div className="space-y-2">{getEventsForDay(selectedDay).map((e,i) => <EventCard key={i} event={e} onClick={openEditModal} />)}</div>
          }
        </div>

        <KidSection name="Camilla" data={weekData.kids.camilla} />
        <KidSection name="Asher" data={weekData.kids.asher} />
        
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100">
          <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-stone-800">🍽️ Tonight's Dinner</h3><button onClick={() => openModal('meal')} className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-bold">+</button></div>
          {getMealForDay(selectedDay) ? <div className="bg-white/70 rounded-xl p-3"><p className="font-semibold text-stone-800">{getMealForDay(selectedDay).meal}</p><p className="text-xs text-stone-500 mt-1">Chef: <PersonBadge person={getMealForDay(selectedDay).prep} /></p></div> : <p className="text-stone-400 text-sm py-3 text-center bg-white/50 rounded-xl">No dinner planned</p>}
        </div>
        
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-4 border border-sky-100">
          <h3 className="font-bold text-stone-800 mb-3">🥪 Tomorrow's Lunches <span className="text-xs font-normal text-stone-500">({days[tomorrowIndex]})</span></h3>
          <div className="space-y-2">{familyMembers.map(m => <div key={m} className="bg-white/70 rounded-xl p-2"><label className="text-xs text-stone-500">{m === 'Camilla' ? '👧' : m === 'Asher' ? '👦' : m === 'Chris' ? '👨' : '👩'} {m}</label><input type="text" value={lunch[m.toLowerCase()] || ''} onChange={(e) => updateLunch(tomorrowIndex, m, e.target.value)} placeholder={`What's ${m} having?`} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-stone-200 text-sm" /></div>)}</div>
        </div>
        
        <div className="bg-white rounded-2xl p-4 border border-stone-100">
          <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-stone-800">✨ Today's Chores</h3><button onClick={() => openModal('chore')} className="w-7 h-7 rounded-full bg-stone-100 text-stone-600 font-bold">+</button></div>
          {getChoresForDay(selectedDay).length === 0 ? <p className="text-stone-400 text-sm py-3 text-center">No chores! 🎉</p> : <div className="space-y-2">{getChoresForDay(selectedDay).map(c => <div key={c.id} className={`flex items-center gap-2 p-2 rounded-xl group ${c.done ? 'bg-emerald-50' : 'bg-stone-50'}`}><button onClick={() => toggleChore(c.id)} className={`w-5 h-5 rounded-full border-2 text-xs ${c.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300'}`}>{c.done && '✓'}</button><span className={`flex-1 text-sm ${c.done ? 'line-through text-stone-400' : ''}`}>{c.task}</span><PersonBadge person={c.person} /><button onClick={() => deleteChore(c.id)} className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs">✕</button></div>)}</div>}
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

  const MealsView = () => (
    <div className="space-y-3 pb-20">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-stone-800">🍽️ Meals</h2><button onClick={() => openModal('meal')} className="px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs">+ Add</button></div>
      {days.map((d, i) => { const m = getMealForDay(i); return <div key={d} className="bg-white rounded-xl p-3 border border-stone-100 flex items-center justify-between"><div><h3 className="font-semibold text-stone-700 text-sm">{d}</h3>{m ? <><p className="text-sm">{m.meal}</p><p className="text-xs text-stone-500">Chef: <PersonBadge person={m.prep} /></p></> : <p className="text-xs text-stone-400">No meal</p>}</div><span className="text-2xl">{m ? '🍲' : '❓'}</span></div>; })}
    </div>
  );

  const WhoSelector = () => (
    <div>
      <label className="text-xs text-stone-500">Who</label>
      {newItem.person === 'Other' ? (
        <div className="space-y-1">
          <input type="text" placeholder="Enter name..." value={newItem.personOther} onChange={e => setNewItem(p => ({ ...p, personOther: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" autoFocus />
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-stone-100 px-4 py-3"><div className="max-w-md mx-auto flex items-center justify-between"><div><h1 className="text-lg font-extrabold text-stone-800">Family HQ 🏠</h1><p className="text-xs text-stone-500">{formatWeekLabel()}</p></div><button onClick={() => window.print()} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs">🖨️ Print</button></div></header>
      <main className="max-w-md mx-auto px-4 py-4">{currentView === 'dashboard' && <DashboardView />}{currentView === 'calendar' && <CalendarView />}{currentView === 'meals' && <MealsView />}{currentView === 'grocery' && <GroceryView />}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-stone-100 px-4 py-2 pb-4"><div className="flex justify-around max-w-md mx-auto"><NavButton view="dashboard" icon="📋" label="Today" /><NavButton view="calendar" icon="📅" label="Calendar" /><NavButton view="meals" icon="🍽️" label="Meals" /><NavButton view="grocery" icon="🛒" label="Grocery" /></div></nav>
      
      {showAddModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => { setShowAddModal(false); setSelectedCalendarDate(null); setEditingEvent(null); }}><div className="bg-white w-full max-w-md rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-stone-800">
            {modalType === 'event' ? (editingEvent ? '✏️ Edit Event' : '📅 Add Event') : modalType === 'meal' ? '🍽️ Add Meal' : modalType === 'chore' ? '✨ Add Chore' : '🛒 Add Item'}
          </h3>
          <button onClick={() => { setShowAddModal(false); setEditingEvent(null); }} className="w-7 h-7 rounded-full bg-stone-100 text-stone-500">✕</button>
        </div>
        <div className="space-y-3">
          {modalType === 'event' && <>
            <input type="text" placeholder="Event title" value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />
            
            {/* All Day Toggle */}
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
              <div><label className="text-xs text-stone-500">Date</label><input type="date" value={newItem.date} onChange={e => setNewItem(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" /></div>
              {!newItem.allDay && (
                <div><label className="text-xs text-stone-500">Time</label><input type="time" value={newItem.time} onChange={e => setNewItem(p => ({ ...p, time: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" /></div>
              )}
            </div>
            <div><label className="text-xs text-stone-500">Category</label><div className="grid grid-cols-3 gap-2 mt-1">{eventCategories.map(c => <button key={c.id} onClick={() => setNewItem(p => ({ ...p, category: c.id }))} className={`flex items-center gap-1 px-2 py-2 rounded-xl border text-xs ${newItem.category === c.id ? 'border-amber-400 bg-amber-50' : 'border-stone-200'}`}><span>{c.icon}</span>{c.label}</button>)}</div></div>
            <div><label className="text-xs text-stone-500">Repeats</label><select value={newItem.recurrence} onChange={e => setNewItem(p => ({ ...p, recurrence: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm mt-1">{recurrenceOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-2">
              <WhoSelector />
              <div><label className="text-xs text-stone-500">Kid</label><select value={newItem.kid} onChange={e => setNewItem(p => ({ ...p, kid: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm"><option>Camilla</option><option>Asher</option><option>Both</option><option>None</option></select></div>
            </div>
            {editingEvent && (
              <button 
                onClick={() => { deleteEvent(editingEvent.id); setShowAddModal(false); setEditingEvent(null); }} 
                className="w-full py-2 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50"
              >
                🗑️ Delete Event
              </button>
            )}
          </>}
          {modalType === 'meal' && <>
            <input type="text" placeholder="What's for dinner?" value={newItem.meal} onChange={e => setNewItem(p => ({ ...p, meal: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={newItem.prep} onChange={e => setNewItem(p => ({ ...p, prep: e.target.value }))} className="px-3 py-2 rounded-xl border border-stone-200 text-sm">{people.map(p => <option key={p}>{p}</option>)}</select>
              <select value={newItem.day} onChange={e => setNewItem(p => ({ ...p, day: parseInt(e.target.value) }))} className="px-3 py-2 rounded-xl border border-stone-200 text-sm">{days.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
            </div>
          </>}
          {modalType === 'chore' && <>
            <input type="text" placeholder="What needs doing?" value={newItem.task} onChange={e => setNewItem(p => ({ ...p, task: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <WhoSelector />
              <div><label className="text-xs text-stone-500">Day</label><select value={newItem.day} onChange={e => setNewItem(p => ({ ...p, day: parseInt(e.target.value) }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm">{days.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>
            </div>
          </>}
          {modalType === 'grocery' && <input type="text" placeholder="Add item..." value={newItem.item} onChange={e => setNewItem(p => ({ ...p, item: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addItem()} className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" />}
          <button onClick={addItem} className={`w-full py-3 rounded-xl text-white font-semibold text-sm ${modalType === 'event' ? 'bg-amber-500' : modalType === 'meal' ? 'bg-orange-500' : modalType === 'chore' ? 'bg-stone-600' : 'bg-blue-500'}`}>
            {editingEvent ? 'Save Changes' : 'Add'}
          </button>
        </div>
      </div></div>}
    </div>
  );
}
