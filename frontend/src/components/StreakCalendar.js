import React, { useState, useEffect } from 'react';

const StreakCalendar = ({ username, language }) => {
  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendar();
  }, [username, language]);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/calendar/get?username=${username}&language=${language}&days=90`
      );
      const data = await response.json();
      setCalendar(data.calendar || []);
    } catch (error) {
      console.error('Error fetching calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntensity = (practiceTime) => {
    if (practiceTime === 0) return 0;
    if (practiceTime < 300) return 1; // < 5 min
    if (practiceTime < 900) return 2; // < 15 min
    if (practiceTime < 1800) return 3; // < 30 min
    return 4; // 30+ min
  };

  const generateCalendarGrid = () => {
    const today = new Date();
    const days = [];
    
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const entry = calendar.find(c => c.date === dateStr);
      days.push({
        date: dateStr,
        dayOfWeek: date.getDay(),
        practiceTime: entry ? entry.practice_time : 0,
        messages: entry ? entry.messages_sent : 0,
        intensity: entry ? getIntensity(entry.practice_time) : 0
      });
    }
    
    return days;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading calendar...</div>;
  }

  const days = generateCalendarGrid();
  const totalDays = days.filter(d => d.practiceTime > 0).length;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px' }}>Practice Streak Calendar</h2>
      
      <div style={{ marginBottom: '24px', display: 'flex', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#667eea' }}>{totalDays}</div>
          <div style={{ color: '#666' }}>Days Practiced</div>
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#28a745' }}>
            {days.reduce((sum, d) => sum + d.messages, 0)}
          </div>
          <div style={{ color: '#666' }}>Total Messages</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: '4px', marginBottom: '16px' }}>
          {days.map((day, idx) => {
            const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
            return (
              <div
                key={idx}
                title={`${day.date}: ${day.messages} messages`}
                style={{
                  width: '100%',
                  paddingTop: '100%',
                  background: colors[day.intensity],
                  borderRadius: '2px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                {day.practiceTime > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    color: day.intensity > 2 ? 'white' : '#333',
                    fontWeight: '700'
                  }}>
                    {Math.floor(day.practiceTime / 60)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#666' }}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              style={{
                width: '12px',
                height: '12px',
                background: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'][level],
                borderRadius: '2px'
              }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default StreakCalendar;
