// State management
let currentMonth = 3;
let currentYear = 2026;
let currentWeekIndex = 0;
let selectedDayForSwap = null; // Stores {weekIndex, dayIndex} of first selected day
let swappedWorkouts = {}; // Store swapped workouts in localStorage-like structure

// Load swapped workouts from localStorage
function loadSwappedWorkouts() {
    const stored = localStorage.getItem('benrunSwaps');
    if (stored) {
        swappedWorkouts = JSON.parse(stored);
    }
}

// Save swapped workouts to localStorage
function saveSwappedWorkouts() {
    localStorage.setItem('benrunSwaps', JSON.stringify(swappedWorkouts));
}

// Get current schedule data
function getCurrentSchedule() {
    return scheduleData[currentYear]?.[currentMonth];
}

// Render current week only
function renderCalendar() {
    const schedule = getCurrentSchedule();
    if (!schedule) {
        document.getElementById('weekContainer').innerHTML = '<p>No schedule available</p>';
        return;
    }

    const week = schedule.weeks[currentWeekIndex];
    if (!week) {
        document.getElementById('weekContainer').innerHTML = '<p>No more weeks available</p>';
        return;
    }

    const monthTitle = `${schedule.month} ${currentYear} - Week ${week.weekNum}`;
    document.getElementById('monthTitle').textContent = monthTitle;

    const weekContainer = document.getElementById('weekContainer');
    weekContainer.innerHTML = '';

    const weekElement = createWeekElement(week, currentWeekIndex);
    weekContainer.appendChild(weekElement);

    // Clear swap status
    clearSwapStatus();
}

// Create week element
function createWeekElement(week, weekIndex) {
    const weekDiv = document.createElement('div');
    weekDiv.className = 'week';
    weekDiv.dataset.weekIndex = weekIndex;

    const title = document.createElement('div');
    title.className = 'week-title';
    title.innerHTML = `
        <div>Week ${week.weekNum} (${week.startDate} – ${week.endDate})</div>
        <div class="week-total">${week.total}</div>
    `;

    const daysGrid = document.createElement('div');
    daysGrid.className = 'days-grid';

    week.days.forEach((day, dayIndex) => {
        const dayElement = createDayElement(day, weekIndex, dayIndex);
        daysGrid.appendChild(dayElement);
    });

    weekDiv.appendChild(title);
    weekDiv.appendChild(daysGrid);

    return weekDiv;
}

// Create day element
function createDayElement(day, weekIndex, dayIndex) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day';
    dayDiv.dataset.weekIndex = weekIndex;
    dayDiv.dataset.dayIndex = dayIndex;

    // Check if this workout has been swapped
    const swapKey = `${currentYear}-${currentMonth}-${weekIndex}-${dayIndex}`;
    const swappedWorkout = swappedWorkouts[swapKey];

    const dateDiv = document.createElement('div');
    dateDiv.className = 'day-date';
    dateDiv.textContent = `${day.day} ${day.date}`;

    const workoutDiv = document.createElement('div');
    workoutDiv.className = 'workout-text';
    workoutDiv.textContent = swappedWorkout || day.workout;

    dayDiv.appendChild(dateDiv);
    dayDiv.appendChild(workoutDiv);

    // Add click handler for two-tap swap
    dayDiv.addEventListener('click', () => handleDayClick(weekIndex, dayIndex, dayDiv));

    return dayDiv;
}

// Handle day click for two-tap swap
function handleDayClick(weekIndex, dayIndex, dayElement) {
    // If no day is selected yet, select this one
    if (!selectedDayForSwap) {
        selectedDayForSwap = { weekIndex, dayIndex };
        dayElement.classList.add('selected');
        showSwapStatus(`${dayElement.textContent.split('\n')[0]} selected. Tap another day to swap.`);
        return;
    }

    // If clicking the same day, deselect
    if (selectedDayForSwap.weekIndex === weekIndex && selectedDayForSwap.dayIndex === dayIndex) {
        dayElement.classList.remove('selected');
        selectedDayForSwap = null;
        clearSwapStatus();
        return;
    }

    // Different day selected - perform swap
    performSwap(selectedDayForSwap.weekIndex, selectedDayForSwap.dayIndex, weekIndex, dayIndex);
    clearSelection();
}

// Perform the actual swap
function performSwap(fromWeekIndex, fromDayIndex, toWeekIndex, toDayIndex) {
    const schedule = getCurrentSchedule();
    
    const fromWeek = schedule.weeks[fromWeekIndex];
    const toWeek = schedule.weeks[toWeekIndex];
    
    const fromDay = fromWeek.days[fromDayIndex];
    const toDay = toWeek.days[toDayIndex];

    const fromSwapKey = `${currentYear}-${currentMonth}-${fromWeekIndex}-${fromDayIndex}`;
    const toSwapKey = `${currentYear}-${currentMonth}-${toWeekIndex}-${toDayIndex}`;

    const fromWorkout = swappedWorkouts[fromSwapKey] || fromDay.workout;
    const toWorkout = swappedWorkouts[toSwapKey] || toDay.workout;

    // Perform swap
    swappedWorkouts[fromSwapKey] = toWorkout;
    swappedWorkouts[toSwapKey] = fromWorkout;

    saveSwappedWorkouts();
    
    // Show success message
    showSwapStatus(`✓ Swapped ${fromDay.day} and ${toDay.day}!`, 'success');
    
    // Re-render if it's the current week
    if (fromWeekIndex === currentWeekIndex || toWeekIndex === currentWeekIndex) {
        renderCalendar();
    }
}

// Clear selection and reset UI
function clearSelection() {
    const selectedDays = document.querySelectorAll('.day.selected');
    selectedDays.forEach(el => el.classList.remove('selected'));
    selectedDayForSwap = null;
    clearSwapStatus();
}

// Show swap status message
function showSwapStatus(message, type = 'info') {
    const statusDiv = document.getElementById('swapStatus');
    const statusText = document.getElementById('swapStatusText');
    
    statusText.textContent = message;
    statusDiv.className = `swap-status ${type}`;
    
    // Auto-clear success message after 3 seconds
    if (type === 'success') {
        setTimeout(clearSwapStatus, 3000);
    }
}

// Clear swap status message
function clearSwapStatus() {
    const statusDiv = document.getElementById('swapStatus');
    statusDiv.classList.add('hidden');
}

// Week navigation
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('prevMonth').onclick = () => {
        const schedule = getCurrentSchedule();
        if (!schedule) return;
        
        currentWeekIndex--;
        if (currentWeekIndex < 0) {
            // Move to previous month
            currentMonth--;
            if (currentMonth < 1) {
                currentMonth = 12;
                currentYear--;
            }
            const newSchedule = getCurrentSchedule();
            if (newSchedule) {
                currentWeekIndex = newSchedule.weeks.length - 1;
            } else {
                currentWeekIndex = 0;
            }
        }
        renderCalendar();
    };

    document.getElementById('nextMonth').onclick = () => {
        const schedule = getCurrentSchedule();
        if (!schedule) return;
        
        currentWeekIndex++;
        if (currentWeekIndex >= schedule.weeks.length) {
            // Move to next month
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
            currentWeekIndex = 0;
        }
        renderCalendar();
    };
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSwappedWorkouts();
    renderCalendar();
});
