// State management
let currentWeekNum = 10;  // Week 10 = start of March (current week)
let currentYear = 2026;
let todayDate = new Date(2026, 1, 20); // Feb 20, 2026
let selectedDayForSwap = null;
let swapModeActive = false;
let currentEditingDay = null;
let swappedWorkouts = {};
let completedWorkouts = {};
let actualDistances = {};

// Load all data from localStorage
function loadAllData() {
    const swaps = localStorage.getItem('benrunSwaps');
    if (swaps) swappedWorkouts = JSON.parse(swaps);
    
    const completed = localStorage.getItem('benrunCompleted');
    if (completed) completedWorkouts = JSON.parse(completed);
    
    const distances = localStorage.getItem('benrunDistances');
    if (distances) actualDistances = JSON.parse(distances);
}

// Save all data to localStorage
function saveAllData() {
    localStorage.setItem('benrunSwaps', JSON.stringify(swappedWorkouts));
    localStorage.setItem('benrunCompleted', JSON.stringify(completedWorkouts));
    localStorage.setItem('benrunDistances', JSON.stringify(actualDistances));
}

// Get current schedule
function getCurrentSchedule() {
    return scheduleData[currentYear]?.[currentMonth];
}

// Find month and week index from week number
function findMonthAndWeekIndex(weekNum, year = currentYear) {
    for (let month = 1; month <= 12; month++) {
        const schedule = scheduleData[year]?.[month];
        if (schedule) {
            for (let weekIdx = 0; weekIdx < schedule.weeks.length; weekIdx++) {
                if (schedule.weeks[weekIdx].weekNum === weekNum) {
                    return { month, weekIndex: weekIdx };
                }
            }
        }
    }
    return null;
}

// Get current schedule by week number
function getScheduleForWeek(weekNum) {
    const result = findMonthAndWeekIndex(weekNum, currentYear);
    if (!result) return null;
    return {
        schedule: scheduleData[currentYear]?.[result.month],
        month: result.month,
        weekIndex: result.weekIndex
    };
}

// Get month name for a given week number
function getMonthForWeek(weekNum) {
    // Approximate mapping - adjust based on your actual week starts
    // Week 1-4 = January, 5-9 = February, 10-14 = March, etc.
    if (weekNum <= 4) return 'January';
    if (weekNum <= 9) return 'February';
    if (weekNum <= 13) return 'March';
    if (weekNum <= 17) return 'April';
    if (weekNum <= 22) return 'May';
    if (weekNum <= 26) return 'June';
    if (weekNum <= 30) return 'July';
    if (weekNum <= 35) return 'August';
    if (weekNum <= 39) return 'September';
    if (weekNum <= 43) return 'October';
    if (weekNum <= 48) return 'November';
    return 'December';
}

// Get the start date for a given week number
function getStartDateForWeek(weekNum, year = 2026) {
    // Map week numbers to approximate start dates
    const weekStarts = {
        1: '1/1', 2: '1/6', 3: '1/13', 4: '1/20',
        5: '1/27', 6: '2/2', 7: '2/9', 8: '2/16', 9: '2/23',
        10: '3/2', 11: '3/9', 12: '3/16', 13: '3/23', 14: '3/30',
        15: '4/6', 16: '4/13', 17: '4/20', 18: '4/27',
        19: '5/4', 20: '5/11', 21: '5/18', 22: '5/25',
        23: '6/1', 24: '6/8', 25: '6/15', 26: '6/22', 27: '6/29',
        28: '7/6', 29: '7/13', 30: '7/20', 31: '7/27',
        32: '8/3', 33: '8/10', 34: '8/17', 35: '8/24', 36: '8/31',
        37: '9/7', 38: '9/14', 39: '9/21', 40: '9/28',
        41: '10/5', 42: '10/12', 43: '10/19', 44: '10/26',
        45: '11/2', 46: '11/9', 47: '11/16', 48: '11/23',
        49: '11/30', 50: '12/7', 51: '12/14', 52: '12/21'
    };
    return weekStarts[weekNum] || null;
}

// Get array of dates for a given week number
function getDatesForWeek(weekNum, year = 2026) {
    const startDateStr = getStartDateForWeek(weekNum);
    if (!startDateStr) return null;
    
    const [month, day] = startDateStr.split('/').map(Number);
    const dates = [];
    let currentDate = new Date(year, month - 1, day);
    
    for (let i = 0; i < 7; i++) {
        const m = currentDate.getMonth() + 1;
        const d = currentDate.getDate();
        dates.push(`${m}/${d}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
}

// Get the first week number for a given month
function getFirstWeekOfMonth(month) {
    // Month is 1-12
    const monthToFirstWeek = {
        1: 1,   // January
        2: 6,   // February
        3: 10,  // March
        4: 15,  // April
        5: 19,  // May
        6: 23,  // June
        7: 28,  // July
        8: 32,  // August
        9: 37,  // September
        10: 41, // October
        11: 45, // November
        12: 49  // December
    };
    return monthToFirstWeek[month];
}

// Find the week number for today's date
function findCurrentWeek() {
    const month = todayDate.getMonth() + 1; // JavaScript months are 0-11
    const day = todayDate.getDate();
    
    for (let m = 1; m <= 12; m++) {
        const schedule = scheduleData[currentYear]?.[m];
        if (!schedule) continue;
        
        for (const week of schedule.weeks) {
            for (const dayObj of week.days) {
                const [dayMonth, dayNum] = dayObj.date.split('/').map(Number);
                if (dayMonth === month && dayNum === day) {
                    return week.weekNum;
                }
            }
        }
    }
    
    return null; // Today's date not in schedule
}

// Get today's info (month, day index, week index)
function getTodayInfo() {
    const month = todayDate.getMonth() + 1;
    const day = todayDate.getDate();
    
    for (let m = 1; m <= 12; m++) {
        const schedule = scheduleData[currentYear]?.[m];
        if (!schedule) continue;
        
        for (let weekIdx = 0; weekIdx < schedule.weeks.length; weekIdx++) {
            const week = schedule.weeks[weekIdx];
            for (let dayIdx = 0; dayIdx < week.days.length; dayIdx++) {
                const dayObj = week.days[dayIdx];
                const [dayMonth, dayNum] = dayObj.date.split('/').map(Number);
                if (dayMonth === month && dayNum === day) {
                    return { month: m, weekIndex: weekIdx, dayIndex: dayIdx };
                }
            }
        }
    }
    
    return null;
}

// Extract numeric value from workout string
function extractMiles(workoutStr) {
    const match = workoutStr.match(/(\d+(?:\.\d+)?)\s*mi/);
    return match ? parseFloat(match[1]) : 0;
}

// Calculate weekly stats
function calculateWeeklyStats() {
    const weekData = getScheduleForWeek(currentWeekNum);
    if (!weekData || !weekData.schedule) {
        return { completed: 0, planned: 0 };
    }
    
    const week = weekData.schedule.weeks[weekData.weekIndex];
    const month = weekData.month;
    
    let plannedTotal = 0;
    let completedTotal = 0;
    
    week.days.forEach((day, dayIndex) => {
        const distanceKey = `${currentYear}-${month}-${weekData.weekIndex}-${dayIndex}`;
        const actualDistance = actualDistances[distanceKey];
        
        // Always use original planned miles for the weekly goal (not swapped workouts)
        const originalPlannedMiles = extractMiles(day.workout);
        if (day.workout !== 'OFF') {
            plannedTotal += originalPlannedMiles;
        }
        
        // Count completed miles - either logged actual or original planned
        if (completedWorkouts[distanceKey]) {
            completedTotal += actualDistance !== undefined ? actualDistance : originalPlannedMiles;
        }
    });
    
    return { completed: completedTotal, planned: plannedTotal };
}

// Update progress bar
function updateProgressBar() {
    const stats = calculateWeeklyStats();
    const percentage = stats.planned > 0 ? (stats.completed / stats.planned) * 100 : 0;
    const isComplete = stats.completed >= stats.planned && stats.planned > 0;
    
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = Math.min(percentage, 100) + '%';
    progressBar.textContent = '';
    
    const trophy = document.getElementById('trophy');
    const progressSection = document.querySelector('.progress-section');
    if (isComplete) {
        progressSection.classList.add('completed');
        trophy.style.display = 'inline';
    } else {
        progressSection.classList.remove('completed');
        trophy.style.display = 'none';
    }
    
    document.getElementById('completedMiles').textContent = stats.completed.toFixed(1);
    document.getElementById('weeklyMiles').textContent = Math.round(stats.planned);
}

// Render calendar
function renderCalendar() {
    const weekData = getScheduleForWeek(currentWeekNum);
    let monthTitle = `Week ${currentWeekNum}`;
    let weekElement = null;

    if (weekData && weekData.schedule) {
        const week = weekData.schedule.weeks[weekData.weekIndex];
        monthTitle = `${weekData.schedule.month} ${currentYear} - Week ${week.weekNum}`;
        weekElement = createWeekElement(week, weekData.weekIndex, weekData.month);
    } else {
        // No schedule for this week - show blank week with day boxes
        const monthName = getMonthForWeek(currentWeekNum);
        monthTitle = `${monthName} ${currentYear} - Week ${currentWeekNum}`;
        weekElement = createBlankWeekElement(currentWeekNum);
    }

    document.getElementById('monthTitle').textContent = monthTitle;

    const weekContainer = document.getElementById('weekContainer');
    weekContainer.innerHTML = '';
    weekContainer.appendChild(weekElement);

    clearSwapStatus();
    updateProgressBar();
}

// Create blank week element for weeks with no data
function createBlankWeekElement(weekNum) {
    const weekDiv = document.createElement('div');
    weekDiv.className = 'week';
    
    const title = document.createElement('div');
    title.className = 'week-title';
    title.innerHTML = `<div>Week ${weekNum} (No scheduled workouts)</div>`;
    
    const daysGrid = document.createElement('div');
    daysGrid.className = 'days-grid';
    
    // Get dates for this week
    const weekDates = getDatesForWeek(weekNum);
    
    // Create 7 empty day boxes (Monday-Sunday)
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    dayNames.forEach((dayName, index) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day blank-day';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        const dateDiv = document.createElement('div');
        dateDiv.className = 'day-date';
        // Show day name and date if available
        const dateStr = weekDates ? weekDates[index] : '';
        dateDiv.textContent = dateStr ? `${dayName} ${dateStr}` : dayName;
        dayHeader.appendChild(dateDiv);
        
        const dayContent = document.createElement('div');
        dayContent.className = 'day-content';
        const workoutDiv = document.createElement('div');
        workoutDiv.className = 'workout-text';
        workoutDiv.textContent = '—';
        dayContent.appendChild(workoutDiv);
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayContent);
        daysGrid.appendChild(dayDiv);
    });
    
    weekDiv.appendChild(title);
    weekDiv.appendChild(daysGrid);
    return weekDiv;
}

// Create week element
function createWeekElement(week, weekIndex, month) {
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
        const dayElement = createDayElement(day, weekIndex, dayIndex, month);
        daysGrid.appendChild(dayElement);
    });

    weekDiv.appendChild(title);
    weekDiv.appendChild(daysGrid);

    return weekDiv;
}

// Create day element
function createDayElement(day, weekIndex, dayIndex, month) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day';
    dayDiv.dataset.weekIndex = weekIndex;
    dayDiv.dataset.dayIndex = dayIndex;

    // Check if completed
    const completionKey = `${currentYear}-${month}-${weekIndex}-${dayIndex}`;
    if (completedWorkouts[completionKey]) {
        dayDiv.classList.add('completed');
    }

    // Check if this is today
    const [dayMonth, dayNum] = day.date.split('/').map(Number);
    if (dayMonth === todayDate.getMonth() + 1 && dayNum === todayDate.getDate()) {
        dayDiv.classList.add('today');
    }

    // Check if this day is selected for swapping
    if (selectedDayForSwap && 
        selectedDayForSwap.weekIndex === weekIndex && 
        selectedDayForSwap.dayIndex === dayIndex) {
        dayDiv.classList.add('swapping');
    }

    // Get workout text (considering swaps)
    const swapKey = `${currentYear}-${month}-${weekIndex}-${dayIndex}`;
    const displayWorkout = swappedWorkouts[swapKey] || day.workout;

    // Create header with date
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';

    const dateDiv = document.createElement('div');
    dateDiv.className = 'day-date';
    dateDiv.textContent = `${day.day} ${day.date}`;

    dayHeader.appendChild(dateDiv);

    // Create content wrapper
    const dayContent = document.createElement('div');
    dayContent.className = 'day-content';

    const workoutDiv = document.createElement('div');
    workoutDiv.className = 'workout-text';
    
    // Check if actual distance was logged
    const distanceKey = `${currentYear}-${month}-${weekIndex}-${dayIndex}`;
    const actualDistance = actualDistances[distanceKey];
    
    if (actualDistance !== undefined) {
        // Show both planned and actual
        workoutDiv.textContent = `${displayWorkout} → ${actualDistance.toFixed(1)} mi ✓`;
    } else {
        // Show only planned
        workoutDiv.textContent = displayWorkout;
    }

    dayContent.appendChild(workoutDiv);

    // Create footer with swap icon, edit icon, and checkbox
    const dayFooter = document.createElement('div');
    dayFooter.className = 'day-footer';

    const swapIcon = document.createElement('div');
    swapIcon.className = 'swap-icon';
    swapIcon.textContent = '🔄';
    swapIcon.title = 'Swap workout';
    swapIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        initiateSwap(weekIndex, dayIndex, month);
    });

    const editIcon = document.createElement('div');
    editIcon.className = 'edit-icon';
    editIcon.textContent = '✏️';
    editIcon.title = 'Log distance';
    editIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        openDistanceModal(weekIndex, dayIndex, displayWorkout, month);
    });

    // Create checkbox
    const checkbox = document.createElement('div');
    checkbox.className = 'day-checkbox';
    if (completedWorkouts[completionKey]) {
        checkbox.classList.add('checked');
        checkbox.textContent = '✓';
    } else {
        checkbox.classList.add('unchecked');
        checkbox.textContent = '';
    }
    checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCompletion(weekIndex, dayIndex, dayDiv, month);
    });

    dayFooter.appendChild(swapIcon);
    dayFooter.appendChild(editIcon);
    dayFooter.appendChild(checkbox);

    dayDiv.appendChild(dayHeader);
    dayDiv.appendChild(dayContent);
    dayDiv.appendChild(dayFooter);

    return dayDiv;
}

// Initiate swap for a specific day
function initiateSwap(weekIndex, dayIndex, month) {
    if (selectedDayForSwap && 
        selectedDayForSwap.weekIndex === weekIndex && 
        selectedDayForSwap.dayIndex === dayIndex) {
        // Clicking same day again cancels
        selectedDayForSwap = null;
        clearSwapStatus();
        renderCalendar();
        return;
    }

    if (!selectedDayForSwap) {
        // First day selected
        selectedDayForSwap = { weekIndex, dayIndex, month };
        const weekData = getScheduleForWeek(currentWeekNum);
        if (weekData && weekData.schedule) {
            const week = weekData.schedule.weeks[weekIndex];
            const day = week.days[dayIndex];
            showSwapStatus(`${day.day} selected. Click 🔄 on another day to complete swap.`, 'info');
        }
        renderCalendar();
    } else if (selectedDayForSwap.weekIndex === weekIndex && selectedDayForSwap.dayIndex === dayIndex) {
        // Cancel swap
        selectedDayForSwap = null;
        clearSwapStatus();
        renderCalendar();
    } else {
        // Second day selected - perform swap
        performSwap(selectedDayForSwap.weekIndex, selectedDayForSwap.dayIndex, selectedDayForSwap.month, 
                   weekIndex, dayIndex, month);
        const fromDay = {day: 'Day'};
        const toDay = {day: 'Day'};
        selectedDayForSwap = null;
        renderCalendar();
        showSwapStatus(`✓ Swapped workouts!`, 'success');
    }
}

// Perform swap
function performSwap(fromWeekIndex, fromDayIndex, fromMonth, toWeekIndex, toDayIndex, toMonth) {
    const fromSwapKey = `${currentYear}-${fromMonth}-${fromWeekIndex}-${fromDayIndex}`;
    const toSwapKey = `${currentYear}-${toMonth}-${toWeekIndex}-${toDayIndex}`;
    const fromDistanceKey = `${currentYear}-${fromMonth}-${fromWeekIndex}-${fromDayIndex}`;
    const toDistanceKey = `${currentYear}-${toMonth}-${toWeekIndex}-${toDayIndex}`;

    const fromWeekData = getScheduleForWeek(currentWeekNum);
    if (!fromWeekData || !fromWeekData.schedule) return;
    
    const fromWeek = fromWeekData.schedule.weeks[fromWeekIndex];
    const toWeek = fromWeekData.schedule.weeks[toWeekIndex];
    
    const fromDay = fromWeek.days[fromDayIndex];
    const toDay = toWeek.days[toDayIndex];

    // Swap workout text
    const fromWorkout = swappedWorkouts[fromSwapKey] || fromDay.workout;
    const toWorkout = swappedWorkouts[toSwapKey] || toDay.workout;

    swappedWorkouts[fromSwapKey] = toWorkout;
    swappedWorkouts[toSwapKey] = fromWorkout;

    // Swap actual distances (if they exist)
    const fromDistance = actualDistances[fromDistanceKey];
    const toDistance = actualDistances[toDistanceKey];

    if (fromDistance !== undefined || toDistance !== undefined) {
        if (fromDistance !== undefined) {
            actualDistances[toDistanceKey] = fromDistance;
        } else {
            delete actualDistances[toDistanceKey];
        }

        if (toDistance !== undefined) {
            actualDistances[fromDistanceKey] = toDistance;
        } else {
            delete actualDistances[fromDistanceKey];
        }
    }

    saveAllData();
    renderCalendar();
}

// Toggle completion
function toggleCompletion(weekIndex, dayIndex, dayElement, month) {
    const completionKey = `${currentYear}-${month}-${weekIndex}-${dayIndex}`;
    const checkbox = dayElement.querySelector('.day-checkbox');
    
    if (completedWorkouts[completionKey]) {
        delete completedWorkouts[completionKey];
        dayElement.classList.remove('completed');
        checkbox.classList.remove('checked');
        checkbox.classList.add('unchecked');
        checkbox.textContent = '';
    } else {
        completedWorkouts[completionKey] = true;
        dayElement.classList.add('completed');
        checkbox.classList.remove('unchecked');
        checkbox.classList.add('checked');
        checkbox.textContent = '✓';
    }
    
    saveAllData();
    updateProgressBar();
}

// Open distance modal
function openDistanceModal(weekIndex, dayIndex, workoutText, month) {
    currentEditingDay = { weekIndex, dayIndex, month };
    const distanceKey = `${currentYear}-${month}-${weekIndex}-${dayIndex}`;
    const currentDistance = actualDistances[distanceKey];
    
    const input = document.getElementById('distanceInput');
    input.value = currentDistance || '';
    input.focus();
    
    const modal = document.getElementById('distanceModal');
    modal.classList.remove('hidden');
}

// Close distance modal
function closeDistanceModal() {
    document.getElementById('distanceModal').classList.add('hidden');
    currentEditingDay = null;
}

// Save distance
function saveDistance() {
    if (!currentEditingDay) return;
    
    const input = document.getElementById('distanceInput');
    const distance = parseFloat(input.value);
    
    if (isNaN(distance) || distance < 0) {
        alert('Please enter a valid distance');
        return;
    }
    
    const distanceKey = `${currentYear}-${currentEditingDay.month}-${currentEditingDay.weekIndex}-${currentEditingDay.dayIndex}`;
    actualDistances[distanceKey] = distance;
    
    // Auto-mark as completed when distance is entered
    const completionKey = distanceKey;
    completedWorkouts[completionKey] = true;
    
    saveAllData();
    closeDistanceModal();
    renderCalendar();
}

// Show swap status
function showSwapStatus(message, type = 'info') {
    const statusDiv = document.getElementById('swapStatus');
    const statusText = document.getElementById('swapStatusText');
    
    statusText.textContent = message;
    statusDiv.className = `swap-status ${type}`;
    
    if (type === 'success') {
        setTimeout(clearSwapStatus, 3000);
    }
}

// Clear swap status
function clearSwapStatus() {
    const statusDiv = document.getElementById('swapStatus');
    statusDiv.classList.add('hidden');
}

// Week navigation
function setupNavigation() {
    document.getElementById('prevMonth').onclick = () => {
        currentWeekNum--;
        if (currentWeekNum < 1) {
            currentWeekNum = 1;  // Stop at week 1
        }
        renderCalendar();
    };

    document.getElementById('nextMonth').onclick = () => {
        currentWeekNum++;
        if (currentWeekNum > 52) {
            currentWeekNum = 52;  // Stop at week 52
        }
        renderCalendar();
    };

    // Month dropdown handler
    document.getElementById('monthDropdown').addEventListener('change', (e) => {
        const month = parseInt(e.target.value);
        if (month) {
            currentWeekNum = getFirstWeekOfMonth(month);
            renderCalendar();
            e.target.value = ''; // Reset dropdown
        }
    });

    // Distance modal controls
    document.querySelector('.close').onclick = closeDistanceModal;
    document.getElementById('cancelDistance').onclick = closeDistanceModal;
    document.getElementById('confirmDistance').onclick = saveDistance;
    
    // Close modal when clicking outside
    document.getElementById('distanceModal').onclick = (e) => {
        if (e.target.id === 'distanceModal') {
            closeDistanceModal();
        }
    };

    // Allow Enter key to save distance
    document.getElementById('distanceInput').onkeypress = (e) => {
        if (e.key === 'Enter') {
            saveDistance();
        }
    };
}

// Get weekly mileage for the past 12 weeks
function getWeeklyMileageData() {
    const data = [];
    const endWeek = currentWeekNum;
    const startWeek = Math.max(1, endWeek - 11); // Last 12 weeks
    
    for (let week = startWeek; week <= endWeek; week++) {
        let weeklyMiles = 0;
        
        const weekData = getScheduleForWeek(week);
        if (weekData && weekData.schedule) {
            const weekSchedule = weekData.schedule.weeks[weekData.weekIndex];
            if (weekSchedule) {
                weekSchedule.days.forEach((day, dayIndex) => {
                    const distanceKey = `${currentYear}-${weekData.month}-${weekData.weekIndex}-${dayIndex}`;
                    const actualDistance = actualDistances[distanceKey];
                    if (actualDistance) {
                        weeklyMiles += actualDistance;
                    } else if (!day.offDay) {
                        weeklyMiles += extractMiles(day.workout);
                    }
                });
            }
        }
        
        data.push({ week, miles: weeklyMiles });
    }
    
    return data;
}

// Draw the mileage chart
function drawMileageChart() {
    const canvas = document.getElementById('mileageChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = getWeeklyMileageData();
    
    // Set canvas size
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 250;
    
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    // Find max mileage for scaling
    const maxMiles = Math.max(...data.map(d => d.miles), 30); // At least 30 as min scale
    
    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        const miles = Math.round((maxMiles / 5) * (5 - i));
        ctx.fillText(miles + 'mi', padding - 10, y + 4);
    }
    
    // Draw the line chart
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    
    data.forEach((point, index) => {
        const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
        const y = canvas.height - padding - (point.miles / maxMiles) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw data point circles
    ctx.fillStyle = '#667eea';
    data.forEach((point, index) => {
        const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
        const y = canvas.height - padding - (point.miles / maxMiles) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    
    // Navigate to current week on page load
    const currentWeek = findCurrentWeek();
    if (currentWeek) {
        currentWeekNum = currentWeek;
    }
    
    setupNavigation();
    renderCalendar();
    drawMileageChart();
    window.addEventListener('resize', drawMileageChart);
});
