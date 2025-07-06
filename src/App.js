import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // State to store all answers by date
  const [allAnswers, setAllAnswers] = useState({});
  
  // State to track which date we're currently viewing
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // State to show status messages
  const [statusMessage, setStatusMessage] = useState('');
  
  // State to control history view
  const [showHistory, setShowHistory] = useState(false);
  
  // State to track loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // API base URL
  const API_BASE_URL = 'https://daily-tracker-backend-production.up.railway.app/api';
  // Helper function to format date as YYYY-MM-DD for storage
  const formatDateForStorage = (date) => {
    // Use local timezone instead of UTC to avoid timezone offset issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Helper function to format date for display
  const formatDateForDisplay = (date) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };
  
  // Get answers for the currently selected date
  const getCurrentAnswers = () => {
    const dateKey = formatDateForStorage(selectedDate);
    return allAnswers[dateKey] || { exercise: null, eating: null };
  };

  // API functions
  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('Making API call to:', url, 'with options:', options);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });
      
      console.log('API response status:', response.status);
      console.log('API response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API response data:', data);
      return data;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  const loadAllEntries = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await apiCall('/entries');
      setAllAnswers(data);
      console.log('Loaded entries from server:', data);
    } catch (error) {
      setError('Failed to load data from server');
      console.error('Error loading entries:', error);
      
      // Fallback to localStorage if server is unavailable
      try {
        const savedAnswers = localStorage.getItem('dailyTrackerAnswers');
        if (savedAnswers) {
          const parsedAnswers = JSON.parse(savedAnswers);
          setAllAnswers(parsedAnswers);
          console.log('Loaded fallback data from localStorage');
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntryToServer = async (date, question, answer) => {
    try {
      console.log('Attempting to save to server:', { date, question, answer });
      
      // Get current entry for this date
      const currentEntry = allAnswers[date] || {};
      console.log('Current entry for date:', currentEntry);
      
      // Update the specific question
      const updatedEntry = {
        ...currentEntry,
        [question]: answer
      };
      console.log('Updated entry to send:', updatedEntry);
      
      const payload = {
        date,
        exercise: updatedEntry.exercise,
        eating: updatedEntry.eating
      };
      console.log('Sending payload to server:', payload);
      
      // Send to server
      const result = await apiCall('/entries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      console.log('Server save result:', result);
      console.log('Successfully saved to server:', { date, question, answer });
      
      // Update local state
      setAllAnswers(prev => ({
        ...prev,
        [date]: updatedEntry
      }));
      
      // Also save to localStorage as backup
      const newAllAnswers = {
        ...allAnswers,
        [date]: updatedEntry
      };
      localStorage.setItem('dailyTrackerAnswers', JSON.stringify(newAllAnswers));
      
    } catch (error) {
      console.error('Detailed error saving to server:', error);
      setError(`Failed to save to server: ${error.message}`);
      
      // Save to localStorage even if server fails
      const dateKey = date;
      const updatedEntry = {
        ...(allAnswers[dateKey] || {}),
        [question]: answer
      };
      
      setAllAnswers(prev => ({
        ...prev,
        [dateKey]: updatedEntry
      }));
      
      const newAllAnswers = {
        ...allAnswers,
        [dateKey]: updatedEntry
      };
      localStorage.setItem('dailyTrackerAnswers', JSON.stringify(newAllAnswers));
    }
  };
  
  // Set up initial data when component loads
  useEffect(() => {
    loadAllEntries();
  }, []);

  // Handle answer selection - THE ONLY handleAnswer FUNCTION
  const handleAnswer = async (question, answer) => {
    try {
      console.log('🔴 NEW handleAnswer called with:', { question, answer });
      
      const dateKey = formatDateForStorage(selectedDate);
      console.log('🔴 Date key:', dateKey);
      
      // Show immediate feedback
      setStatusMessage(`Saving answer for ${formatDateForDisplay(selectedDate)}...`);
      
      // Save to server
      console.log('🔴 About to call saveEntryToServer');
      await saveEntryToServer(dateKey, question, answer);
      console.log('🔴 saveEntryToServer completed');
      
      // Update status message
      setStatusMessage(`Answer saved for ${formatDateForDisplay(selectedDate)}`);
      
      // Hide status after 2 seconds
      setTimeout(() => {
        setStatusMessage('');
        setError('');
      }, 2000);
      
      console.log(`🔴 Final log - Date: ${dateKey}, Question: ${question}, Answer: ${answer}`);
    } catch (error) {
      console.error('🔴 CRITICAL ERROR in handleAnswer:', error);
      console.error('🔴 Error stack:', error.stack);
      setError(`Critical error: ${error.message}`);
    }
  };

  // Navigate to different dates
  const changeDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };
  
  // Handle date picker change
  const handleDatePickerChange = (event) => {
    const dateString = event.target.value; // This will be in YYYY-MM-DD format
    if (dateString) {
      // Parse the date string in local timezone
      const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
      const newDate = new Date(year, month - 1, day);
      setSelectedDate(newDate);
    }
  };
  
  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date());
  };
  
  // Check if selected date is today
  const isToday = () => {
    const today = new Date();
    return formatDateForStorage(selectedDate) === formatDateForStorage(today);
  };

  // Component for individual question
  const QuestionComponent = ({ title, questionKey }) => {
    const currentAnswers = getCurrentAnswers();
    
    return (
      <div className="question">
        <h3>{title}</h3>
        <div className="button-group">
          <button 
            className={`yes-btn ${currentAnswers[questionKey] === 'yes' ? 'selected' : ''}`}
            onClick={() => {
              console.log('🟡 Direct button click - calling handleAnswer');
              handleAnswer(questionKey, 'yes');
            }}
          >
            Yes
          </button>
          <button 
            className={`no-btn ${currentAnswers[questionKey] === 'no' ? 'selected' : ''}`}
            onClick={() => {
              console.log('🟡 Direct button click - calling handleAnswer');
              handleAnswer(questionKey, 'no');
            }}
          >
            No
          </button>
          <button 
            className={`no-answer-btn ${currentAnswers[questionKey] === 'no-answer' ? 'selected' : ''}`}
            onClick={() => {
              console.log('🟡 Direct button click - calling handleAnswer');
              handleAnswer(questionKey, 'no-answer');
            }}
          >
            No Answer
          </button>
        </div>
      </div>
    );
  };
  
  // Component for history view
  const HistoryComponent = () => {
    const [calendarDate, setCalendarDate] = useState(new Date());
    
    // Get the first day of the month and calculate calendar grid
    const getCalendarDays = () => {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      
      // First day of the month
      const firstDay = new Date(year, month, 1);
      // Last day of the month
      const lastDay = new Date(year, month + 1, 0);
      
      // Start calendar on Sunday before the first day
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      // Generate 42 days (6 weeks) for complete calendar grid
      const days = [];
      const currentDate = new Date(startDate);
      
      for (let i = 0; i < 42; i++) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return { days, currentMonth: month, currentYear: year };
    };
    
    const { days, currentMonth, currentYear } = getCalendarDays();
    
    // Navigate calendar months
    const changeMonth = (direction) => {
      const newDate = new Date(calendarDate);
      newDate.setMonth(newDate.getMonth() + direction);
      setCalendarDate(newDate);
    };
    
    // Get month/year display
    const getMonthYearDisplay = () => {
      const options = { month: 'long', year: 'numeric' };
      return calendarDate.toLocaleDateString('en-US', options);
    };
    
    return (
      <div className="history-container">
        <div className="calendar-header">
          <h3>Your Habit Calendar</h3>
          
          <div className="calendar-navigation">
            <button className="nav-btn" onClick={() => changeMonth(-1)}>
              ← Previous
            </button>
            <span className="month-year-display">{getMonthYearDisplay()}</span>
            <button className="nav-btn" onClick={() => changeMonth(1)}>
              Next →
            </button>
          </div>
          
          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-indicator exercise yes"></div>
              <span>Exercised</span>
            </div>
            <div className="legend-item">
              <div className="legend-indicator exercise no"></div>
              <span>No Exercise</span>
            </div>
            <div className="legend-item">
              <div className="legend-indicator eating yes"></div>
              <span>Too much</span>
            </div>
            <div className="legend-item">
              <div className="legend-indicator eating no"></div>
              <span>Just right</span>
            </div>
            <div className="legend-item">
              <div className="legend-indicator no-data"></div>
              <span>No Data</span>
            </div>
          </div>
        </div>
        
        <div className="calendar-grid">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-day-header">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {days.map((day, index) => {
            const dateKey = formatDateForStorage(day);
            const dayAnswers = allAnswers[dateKey];
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isToday = formatDateForStorage(day) === formatDateForStorage(new Date());
            
            return (
              <div
                key={index}
                className={`calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}`}
                onClick={() => {
                  setSelectedDate(day);
                  setShowHistory(false);
                }}
              >
                <div className="day-number">{day.getDate()}</div>
                
                {dayAnswers && (
                  <div className="day-indicators">
                    <div 
                      className={`indicator exercise ${dayAnswers.exercise || 'no-data'}`}
                      title={`Exercise: ${dayAnswers.exercise || 'No answer'}`}
                    ></div>
                    <div 
                      className={`indicator eating ${dayAnswers.eating || 'no-data'}`}
                      title={`Eating: ${dayAnswers.eating || 'No answer'}`}
                    ></div>
                  </div>
                )}
                
                {!dayAnswers && isCurrentMonth && (
                  <div className="day-indicators">
                    <div className="indicator no-data" title="No data"></div>
                    <div className="indicator no-data" title="No data"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="calendar-stats">
          {Object.keys(allAnswers).length > 0 && (
            <div className="stats-summary">
              <h4>Quick Stats</h4>
              <p>Total days tracked: {Object.keys(allAnswers).length}</p>
              <p>Days exercised: {Object.values(allAnswers).filter(day => day.exercise === 'yes').length}</p>
              <p>Days overate: {Object.values(allAnswers).filter(day => day.eating === 'yes').length}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <h1>Daily Tracker</h1>
      
      {!showHistory ? (
        <>
          {/* Loading and Error Messages */}
          {isLoading && (
            <div className="loading-message">
              Loading your data...
            </div>
          )}
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {/* Date Navigation */}
          <div className="date-navigation">
            <button className="nav-btn" onClick={() => changeDate(-1)}>
              ← Previous
            </button>
            
            <div className="date-display-section">
              <div className="date-display">
                <strong>
                  {isToday() ? 'Today: ' : ''}{formatDateForDisplay(selectedDate)}
                </strong>
              </div>
              
              <div className="date-picker-section">
                <input
                  type="date"
                  value={formatDateForStorage(selectedDate)}
                  onChange={handleDatePickerChange}
                  className="date-picker"
                />
                {!isToday() && (
                  <button className="today-btn" onClick={goToToday}>
                    Today
                  </button>
                )}
              </div>
            </div>
            
            <button className="nav-btn" onClick={() => changeDate(1)}>
              Next →
            </button>
          </div>
          
          {/* Navigation Buttons */}
          <div className="main-navigation">
            <button className="history-btn" onClick={() => setShowHistory(true)}>
              View History
            </button>
          </div>
          
          {/* Questions */}
          <QuestionComponent 
            title="Did I exercise today?" 
            questionKey="exercise" 
          />
          
          <QuestionComponent 
            title="Do I feel like I ate too much today?" 
            questionKey="eating" 
          />
          
          {statusMessage && (
            <div className="status">
              {statusMessage}
            </div>
          )}
          
          {/* Debug section */}
          <div className="debug-section">
            <details>
              <summary>Debug Info (click to expand)</summary>
              <div className="debug-content">
                <p><strong>Total entries:</strong> {Object.keys(allAnswers).length}</p>
                <p><strong>Data source:</strong> Server API + localStorage backup</p>
                <p><strong>API Status:</strong> {error ? 'Error' : 'Connected'}</p>
                <p><strong>Server URL:</strong> {API_BASE_URL}</p>
                <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
                <p><strong>Data in state:</strong></p>
                <pre>{JSON.stringify(allAnswers, null, 2)}</pre>
                <div className="debug-buttons">
                  <button 
                    className="debug-btn"
                    onClick={() => {
                      localStorage.clear();
                      setAllAnswers({});
                      alert('LocalStorage cleared');
                    }}
                  >
                    Clear LocalStorage
                  </button>
                  <button 
                    className="debug-btn"
                    onClick={() => loadAllEntries()}
                  >
                    Reload from Server
                  </button>
                </div>
              </div>
            </details>
          </div>
        </>
      ) : (
        <>
          {/* History View */}
          <div className="main-navigation">
            <button className="back-btn" onClick={() => setShowHistory(false)}>
              ← Back to Tracker
            </button>
          </div>
          
          <HistoryComponent />
        </>
      )}
    </div>
  );
}

export default App;