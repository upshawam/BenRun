// Initialize auth and app
let currentUser = null;
let isSignUpMode = false;
let currentUserRole = 'runner'; // 'runner' or 'coach'
let viewingRunnerId = null; // For coaches viewing a specific runner

// Initialize auth and app
async function initializeApp() {
    // Check if user is logged in
    const session = await checkAuth();
    
    if (session) {
        currentUser = session.user;
        
        // Ensure user profile exists (create if missing)
        await ensureUserProfileExists(currentUser.id, currentUser.email);
        
        // Load user role from Supabase
        currentUserRole = await loadUserRole(currentUser.id);
        
        // Show/hide runner selector based on role
        const runnerSelector = document.getElementById('runnerSelector');
        const coachPanel = document.getElementById('coachPanel');
        if (currentUserRole === 'coach') {
            runnerSelector.classList.remove('hidden');
            
            // Load all runners for dropdown
            try {
                const runners = await getAllRunners();
                populateRunnerDropdown(runners);
                
                // Set up runner selection handler
                document.getElementById('runnerDropdown').addEventListener('change', async (e) => {
                    viewingRunnerId = e.target.value;
                    if (viewingRunnerId) {
                        document.getElementById('selectedRunnerName').textContent = e.target.options[e.target.selectedIndex].text;
                        // Load that runner's data
                        await loadRunnerData(viewingRunnerId);
                        renderCalendar();
                        drawMileageChart();
                    } else {
                        coachPanel.classList.add('hidden');
                        document.getElementById('weekContainer').innerHTML = '<p>Select a runner to view their schedule</p>';
                    }
                });
            } catch (err) {
                console.error('Error loading runners:', err);
            }
        } else {
            runnerSelector.classList.add('hidden');
            coachPanel.classList.add('hidden');
            viewingRunnerId = null;
        }
        
        // Migrate any localStorage data to Supabase on first login
        await migrateLocalStorageToSupabase(currentUser.id);
        
        showApp();
        await loadAllData();
        
        // Navigate to current week on page load
        const currentWeek = findCurrentWeek();
        if (currentWeek) {
            currentWeekNum = currentWeek;
        }
        
        // Initialize chart to show last 12 weeks from current week
        chartEndWeek = currentWeekNum;
        
        setupNavigation();
        renderCalendar();
        drawMileageChart();
        window.addEventListener('resize', drawMileageChart);
    } else {
        showAuth();
    }
}

function showAuth() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

async function handleLogout() {
    const error = await signOut();
    if (error) {
        console.error('Logout error:', error);
    } else {
        currentUser = null;
        currentUserRole = 'runner';
        viewingRunnerId = null;
        showAuth();
    }
}

function showApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

function switchAuthMode(toSignUp) {
    isSignUpMode = toSignUp;
    const modeTitle = document.getElementById('authModeTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleBtn = document.getElementById('toggleAuthMode');
    const toggleText = document.querySelector('.auth-toggle');
    
    if (toSignUp) {
        modeTitle.textContent = 'Create Account';
        submitBtn.textContent = 'Create Account';
        toggleText.innerHTML = 'Already have an account? <button id="toggleAuthMode" class="auth-toggle-btn">Sign in</button>';
        document.getElementById('toggleAuthMode').addEventListener('click', () => switchAuthMode(false));
    } else {
        modeTitle.textContent = 'Sign In';
        submitBtn.textContent = 'Sign In';
        toggleText.innerHTML = "Don't have an account? <button id=\"toggleAuthMode\" class=\"auth-toggle-btn\">Create one</button>";
        document.getElementById('toggleAuthMode').addEventListener('click', () => switchAuthMode(true));
    }
    
    document.getElementById('authError').textContent = '';
}

// State management
let currentWeekNum = 10;  // Week 10 = start of March (current week)
let currentYear = 2026;
let todayDate = new Date(); // Current date (live)
let selectedDayForSwap = null;
let swapModeActive = false;
let currentEditingDay = null;
let swappedWorkouts = {};
let completedWorkouts = {};
let actualDistances = {};
let blankWeekGoals = {}; // Store weekly mileage goals for blank weeks
let blankWeekWorkouts = {}; // Store custom workout descriptions for blank week days
let chartEndWeek = null; // For the 12-week mileage chart - initialized on load

// Load all data from localStorage
async function loadAllData() {
    if (!currentUser) return;
    
    // Load from Supabase
    const completedData = await loadCompletedWorkouts(currentUser.id);
    actualDistances = await loadActualDistances(currentUser.id);
    blankWeekGoals = await loadBlankWeekGoals(currentUser.id);
    blankWeekWorkouts = await loadBlankWeekWorkouts(currentUser.id);
    swappedWorkouts = await loadSwappedWorkouts(currentUser.id);
    
    // Filter out false values - only keep true entries
    completedWorkouts = {};
    for (const [key, value] of Object.entries(completedData)) {
        if (value === true) {
            completedWorkouts[key] = true;
        }
    }
}

// Save all data to Supabase
async function saveAllData() {
    if (!currentUser) return;
    
    const userId = currentUser.id;
    
    // Save swapped workouts
    for (const [weekKey, swapData] of Object.entries(swappedWorkouts)) {
        await saveSwappedWorkout(userId, weekKey, swapData);
    }
    
    // Save completed workouts
    for (const [dateKey, workout] of Object.entries(completedWorkouts)) {
        await saveCompletedWorkout(userId, dateKey, workout);
    }
    
    // Save actual distances
    for (const [dateKey, distance] of Object.entries(actualDistances)) {
        await saveActualDistance(userId, dateKey, distance);
    }
    
    // Save blank week goals
    for (const [weekKey, goal] of Object.entries(blankWeekGoals)) {
        await saveBlankWeekGoal(userId, weekKey, goal);
    }
    
    // Save blank week workouts
    for (const [weekKey, workout] of Object.entries(blankWeekWorkouts)) {
        await saveBlankWeekWorkout(userId, weekKey, workout);
    }
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

// Get the end date for a given week number
function getEndDateForWeek(weekNum, year = 2026) {
    const startDateStr = getStartDateForWeek(weekNum);
    if (!startDateStr) return null;
    
    const [month, day] = startDateStr.split('/').map(Number);
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // 7 days later
    
    const m = endDate.getMonth() + 1;
    const d = endDate.getDate();
    return `${m}/${d}`;
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
    
    let plannedTotal = 0;
    let completedTotal = 0;
    
    if (!weekData || !weekData.schedule) {
        // Blank week - use manually set goal if available
        const weekKey = `${currentYear}-${currentWeekNum}`;
        plannedTotal = blankWeekGoals[weekKey] || 0;
        
        // Only count completed miles from checked days
        const weekDates = getDatesForWeek(currentWeekNum);
        if (weekDates) {
            weekDates.forEach(dateStr => {
                const distanceKey = `${currentYear}-${dateStr}`;
                const actualDistance = actualDistances[distanceKey];
                
                // Only add to completed if marked as complete AND has a logged distance
                if (completedWorkouts[distanceKey] && actualDistance !== undefined) {
                    completedTotal += actualDistance;
                }
            });
        }
        return { completed: completedTotal, planned: plannedTotal };
    }
    
    const week = weekData.schedule.weeks[weekData.weekIndex];
    const month = weekData.month;
    
    week.days.forEach((day, dayIndex) => {
        // Use date-based key so it matches how distances are stored
        const distanceKey = `${currentYear}-${day.date}`;
        const actualDistance = actualDistances[distanceKey];

        // Use the swapped workout text if this slot was swapped, otherwise original
        const swapKey = `${currentYear}-${weekData.month}-${weekData.weekIndex}-${dayIndex}`;
        const effectiveWorkout = swappedWorkouts[swapKey] || day.workout;
        const effectiveMiles = extractMiles(effectiveWorkout);

        // Planned total uses the effective (post-swap) workout
        if (effectiveWorkout !== 'OFF') {
            plannedTotal += effectiveMiles;
        }
        
        // Count completed miles - either logged actual distance or effective planned miles
        if (completedWorkouts[distanceKey]) {
            completedTotal += actualDistance !== undefined ? actualDistance : effectiveMiles;
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
    
    const weekKey = `${currentYear}-${weekNum}`;
    const weekGoal = blankWeekGoals[weekKey] || 0;
    
    const title = document.createElement('div');
    title.className = 'week-title';
    title.innerHTML = `
        <div>Week ${weekNum} (No scheduled workouts)</div>
        <div class="week-total" style="cursor: pointer; text-decoration: underline;" onclick="setBlankWeekGoal(${weekNum})" title="Click to set weekly goal">
            Goal: ${weekGoal} mi
        </div>
    `;
    
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
        
        // Check if there's a logged distance for this date
        if (dateStr) {
            const distanceKey = `${currentYear}-${dateStr}`;
            const actualDistance = actualDistances[distanceKey];
            const workoutText = blankWeekWorkouts[distanceKey];
            
            if (actualDistance !== undefined) {
                if (workoutText) {
                    const displayText = `${actualDistance.toFixed(1)} mi (${workoutText})`;
                    workoutDiv.textContent = displayText;
                    workoutDiv.title = displayText; // Show full text on hover
                } else {
                    workoutDiv.textContent = `${actualDistance.toFixed(1)} mi`;
                }
            } else {
                workoutDiv.textContent = '—';
            }
        } else {
            workoutDiv.textContent = '—';
        }
        
        dayContent.appendChild(workoutDiv);
        
        // Add footer with icons
        const dayFooter = document.createElement('div');
        dayFooter.className = 'day-footer';
        
        const swapIcon = document.createElement('div');
        swapIcon.className = 'swap-icon';
        swapIcon.textContent = '🔄';
        swapIcon.title = 'Swap workout';
        swapIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            // For blank weeks, we need special handling since there's no month/weekIndex in schedule data
            alert('Swap not available for blank weeks yet');
        });
        
        const editIcon = document.createElement('div');
        editIcon.className = 'edit-icon';
        editIcon.textContent = '✏️';
        editIcon.title = 'Log distance';
        editIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dateStr) {
                openDistanceModalForBlankDay(dateStr);
            }
        });
        
        // Create checkbox
        const checkbox = document.createElement('div');
        checkbox.className = 'day-checkbox';
        if (dateStr) {
            const completionKey = `${currentYear}-${dateStr}`;
            if (completedWorkouts[completionKey]) {
                checkbox.classList.add('checked');
                checkbox.textContent = '✓';
            } else {
                checkbox.classList.add('unchecked');
                checkbox.textContent = '';
            }
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCompletionForBlankDay(dateStr, checkbox);
            });
        } else {
            checkbox.classList.add('unchecked');
        }
        
        dayFooter.appendChild(swapIcon);
        dayFooter.appendChild(editIcon);
        dayFooter.appendChild(checkbox);
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(dayContent);
        dayDiv.appendChild(dayFooter);
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
    // Use date-based key so completion stays with the date, not the slot
    const completionKey = `${currentYear}-${day.date}`;
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
    
    // Use date-based key so distance stays with the date, not the slot
    const distanceKey = `${currentYear}-${day.date}`;
    const actualDistance = actualDistances[distanceKey];
    
    if (actualDistance !== undefined) {
        // Show workout with actual distance logged
        const prescribedMiles = extractMiles(displayWorkout);
        if (prescribedMiles > 0) {
            const displayText = `${displayWorkout} (${prescribedMiles} mi → ${actualDistance.toFixed(1)} mi)`;
            workoutDiv.textContent = displayText;
            workoutDiv.title = displayText; // Show full text on hover
        } else {
            workoutDiv.textContent = `${actualDistance.toFixed(1)} mi`;
        }
    } else {
        // Show only planned
        workoutDiv.textContent = displayWorkout;
        workoutDiv.title = displayWorkout; // Show full text on hover
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
    const fromSchedule = scheduleData[currentYear]?.[fromMonth];
    const fromWeek = fromSchedule?.weeks[fromWeekIndex];
    const fromDay = fromWeek?.days[fromDayIndex];

    const toSchedule = scheduleData[currentYear]?.[toMonth];
    const toWeek = toSchedule?.weeks[toWeekIndex];
    const toDay = toWeek?.days[toDayIndex];

    if (!fromDay || !toDay) return;

    // Position-based keys for the workout text (which slot holds which workout)
    const fromSwapKey = `${currentYear}-${fromMonth}-${fromWeekIndex}-${fromDayIndex}`;
    const toSwapKey = `${currentYear}-${toMonth}-${toWeekIndex}-${toDayIndex}`;

    // Swap workout text between slots
    const fromWorkout = swappedWorkouts[fromSwapKey] || fromDay.workout;
    const toWorkout = swappedWorkouts[toSwapKey] || toDay.workout;
    swappedWorkouts[fromSwapKey] = toWorkout;
    swappedWorkouts[toSwapKey] = fromWorkout;

    // Date-based keys for distances and completions
    // The distance/completion is tied to the DATE (which never changes),
    // so there is NOTHING to swap here — the data naturally follows the date box.
    // No action needed for actualDistances or completedWorkouts.

    saveAllData();
    renderCalendar();
}

// Toggle completion
function toggleCompletion(weekIndex, dayIndex, dayElement, month) {
    // Get the date string for this day so the key is date-based (not position-based)
    const schedule = scheduleData[currentYear]?.[month];
    const week = schedule?.weeks[weekIndex];
    const day = week?.days[dayIndex];
    const completionKey = day ? `${currentYear}-${day.date}` : `${currentYear}-${month}-${weekIndex}-${dayIndex}`;
    const checkbox = dayElement.querySelector('.day-checkbox');
    
    if (completedWorkouts[completionKey]) {
        completedWorkouts[completionKey] = false;
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
    currentEditingDay = { weekIndex, dayIndex, month, isBlankDay: false };
    
    // Use date-based key so distance is tied to the date, not the position
    const schedule = scheduleData[currentYear]?.[month];
    const week = schedule?.weeks[weekIndex];
    const day = week?.days[dayIndex];
    
    const distanceKey = day ? `${currentYear}-${day.date}` : `${currentYear}-${month}-${weekIndex}-${dayIndex}`;
    const currentDistance = actualDistances[distanceKey];
    
    // Show prescribed miles
    const prescribedMilesInfo = document.getElementById('prescribedMilesInfo');
    const prescribedMilesDisplay = document.getElementById('prescribedMiles');
    const swapKey = `${currentYear}-${month}-${weekIndex}-${dayIndex}`;
    const displayWorkout = swappedWorkouts[swapKey] || workoutText;
    const prescribedMiles = extractMiles(displayWorkout);
    
    if (prescribedMiles > 0) {
        prescribedMilesInfo.style.display = 'block';
        prescribedMilesDisplay.textContent = `${prescribedMiles} miles (${displayWorkout})`;
    } else {
        prescribedMilesInfo.style.display = 'none';
    }
    
    // Hide workout text editing for scheduled days
    document.getElementById('workoutTextGroup').style.display = 'none';
    
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
    
    // Handle blank day separately
    if (currentEditingDay.isBlankDay) {
        saveDistanceForBlankDay();
        return;
    }
    
    const input = document.getElementById('distanceInput');
    const distance = parseFloat(input.value);
    
    if (isNaN(distance) || distance < 0) {
        alert('Please enter a valid distance');
        return;
    }
    
    // Use date-based key so distance is tied to the date, not the position
    const schedule = scheduleData[currentYear]?.[currentEditingDay.month];
    const week = schedule?.weeks[currentEditingDay.weekIndex];
    const day = week?.days[currentEditingDay.dayIndex];
    
    const distanceKey = day ? `${currentYear}-${day.date}` : `${currentYear}-${currentEditingDay.month}-${currentEditingDay.weekIndex}-${currentEditingDay.dayIndex}`;
    actualDistances[distanceKey] = distance;
    
    // Auto-mark as completed when distance is entered
    const completionKey = distanceKey;
    completedWorkouts[completionKey] = true;
    
    saveAllData();
    closeDistanceModal();
    renderCalendar();
}

// Open distance modal for blank week days
function openDistanceModalForBlankDay(dateStr) {
    currentEditingDay = { dateStr, isBlankDay: true };
    
    const distanceKey = `${currentYear}-${dateStr}`;
    const currentDistance = actualDistances[distanceKey];
    const currentWorkout = blankWeekWorkouts[distanceKey] || '';
    
    // Hide prescribed miles info for blank days
    document.getElementById('prescribedMilesInfo').style.display = 'none';
    
    // Show workout text editing for blank days
    document.getElementById('workoutTextGroup').style.display = 'block';
    document.getElementById('workoutTextInput').value = currentWorkout;
    
    const input = document.getElementById('distanceInput');
    input.value = currentDistance || '';
    input.focus();
    
    const modal = document.getElementById('distanceModal');
    modal.classList.remove('hidden');
}

// Save distance for blank week days
function saveDistanceForBlankDay() {
    if (!currentEditingDay || !currentEditingDay.isBlankDay) return;
    
    const input = document.getElementById('distanceInput');
    const distance = parseFloat(input.value);
    
    if (isNaN(distance) || distance < 0) {
        alert('Please enter a valid distance');
        return;
    }
    
    const distanceKey = `${currentYear}-${currentEditingDay.dateStr}`;
    actualDistances[distanceKey] = distance;
    
    // Save workout text if provided
    const workoutTextInput = document.getElementById('workoutTextInput');
    const workoutText = workoutTextInput.value.trim();
    if (workoutText) {
        blankWeekWorkouts[distanceKey] = workoutText;
    } else {
        delete blankWeekWorkouts[distanceKey];
    }
    
    // Auto-mark as completed when distance is entered
    completedWorkouts[distanceKey] = true;
    
    // Always recalculate and update the weekly goal based on all logged miles for this week
    const weekKey = `${currentYear}-${currentWeekNum}`;
    let weeklyTotal = 0;
    const weekDates = getDatesForWeek(currentWeekNum);
    if (weekDates) {
        weekDates.forEach(dateStr => {
            const key = `${currentYear}-${dateStr}`;
            if (actualDistances[key] !== undefined) {
                weeklyTotal += actualDistances[key];
            }
        });
    }
    // Set goal to the sum of all logged miles (minimum 1 to show progress bar)
    blankWeekGoals[weekKey] = Math.max(weeklyTotal, 1);
    
    saveAllData();
    closeDistanceModal();
    renderCalendar();
}

// Toggle completion for blank week days
function toggleCompletionForBlankDay(dateStr, checkbox) {
    const completionKey = `${currentYear}-${dateStr}`;
    
    if (completedWorkouts[completionKey]) {
        delete completedWorkouts[completionKey];
        checkbox.classList.remove('checked');
        checkbox.classList.add('unchecked');
        checkbox.textContent = '';
    } else {
        completedWorkouts[completionKey] = true;
        checkbox.classList.remove('unchecked');
        checkbox.classList.add('checked');
        checkbox.textContent = '✓';
    }
    
    saveAllData();
    updateProgressBar();
}

// Set blank week goal
function setBlankWeekGoal(weekNum) {
    const weekKey = `${currentYear}-${weekNum}`;
    const currentGoal = blankWeekGoals[weekKey] || 0;
    
    const newGoal = prompt(`Set weekly mileage goal for Week ${weekNum}:`, currentGoal);
    if (newGoal === null) return; // Cancelled
    
    const goalMiles = parseFloat(newGoal);
    if (isNaN(goalMiles) || goalMiles < 0) {
        alert('Please enter a valid mileage goal');
        return;
    }
    
    blankWeekGoals[weekKey] = goalMiles;
    saveAllData();
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
            // Keep the selected month in the dropdown - don't reset it
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
function getWeeklyMileageData(endWeek = null) {
    const data = [];
    const finalEndWeek = endWeek || chartEndWeek || currentWeekNum;
    const startWeek = Math.max(1, finalEndWeek - 11); // Last 12 weeks
    
    for (let week = startWeek; week <= finalEndWeek; week++) {
        let weeklyMiles = 0;
        
        const weekData = getScheduleForWeek(week);
        if (weekData && weekData.schedule) {
            const weekSchedule = weekData.schedule.weeks[weekData.weekIndex];
            if (weekSchedule) {
                weekSchedule.days.forEach((day, dayIndex) => {
                    // Use date-based key to match how distances are stored
                    const distanceKey = `${currentYear}-${day.date}`;
                    // Only count miles if the workout is completed (checked off)
                    if (completedWorkouts[distanceKey]) {
                        const actualDistance = actualDistances[distanceKey];
                        if (actualDistance) {
                            weeklyMiles += actualDistance;
                        } else if (!day.offDay) {
                            weeklyMiles += extractMiles(day.workout);
                        }
                    }
                });
            }
        }
        
        data.push({ week: week, miles: weeklyMiles, weekNum: week });
    }
    
    return data;
}

// Draw the mileage chart
function drawMileageChart() {
    const canvas = document.getElementById('mileageChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = getWeeklyMileageData(chartEndWeek);
    
    // Update date range display (only if element exists)
    const chartDateRange = document.getElementById('chartDateRange');
    if (chartDateRange && data.length >= 2) {
        const startWeek = data[0].weekNum;
        const endWeek = data[data.length - 1].weekNum;
        const startDate = getStartDateForWeek(startWeek);
        const endDate = getEndDateForWeek(endWeek);
        chartDateRange.textContent = `${startDate} - ${endDate}`;
    }
    
    // Set canvas size with DPI scaling for sharp text
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = 250 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '250px';
    
    // Scale the context to match device pixel ratio
    ctx.scale(dpr, dpr);
    
    const padding = 40;
    const chartWidth = (rect.width - padding * 2);
    const chartHeight = (250 - padding * 2);
    
    const scaledWidth = rect.width;
    const scaledHeight = 250;
    
    // Find max mileage for scaling
    const maxMiles = Math.max(...data.map(d => d.miles), 30); // At least 30 as min scale
    
    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, scaledWidth, scaledHeight);
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(scaledWidth - padding, y);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, scaledHeight - padding);
    ctx.lineTo(scaledWidth - padding, scaledHeight - padding);
    ctx.stroke();
    
    // Draw Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
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
        const y = scaledHeight - padding - (point.miles / maxMiles) * chartHeight;
        
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
        const y = scaledHeight - padding - (point.miles / maxMiles) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Store point locations for hover and click detection
    canvas.chartPoints = data.map((point, index) => {
        const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
        const y = scaledHeight - padding - (point.miles / maxMiles) * chartHeight;
        return { x, y, miles: point.miles, weekNum: point.weekNum };
    });
    
    // Make canvas interactive
    canvas.style.cursor = 'default';
    
    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        let hoveredPoint = null;
        for (const point of canvas.chartPoints) {
            const distance = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2);
            if (distance < 40) { // 40px hover radius - much larger for easier clicking
                hoveredPoint = point;
                break;
            }
        }
        
        if (hoveredPoint) {
            canvas.style.cursor = 'pointer';
            // Draw tooltip
            drawTooltip(ctx, hoveredPoint, canvas);
        } else {
            canvas.style.cursor = 'default';
            redrawChart();
        }
    };
    
    canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        for (const point of canvas.chartPoints) {
            const distance = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2);
            if (distance < 40) {
                currentWeekNum = point.weekNum;
                renderCalendar();
                break;
            }
        }
    };
    
    function drawTooltip(ctx, point, canvas) {
        // Redraw the chart first
        redrawChart();
        
        // Draw tooltip
        const tooltipWidth = 100;
        const tooltipHeight = 40;
        let tooltipX = point.x - tooltipWidth / 2;
        let tooltipY = point.y - tooltipHeight - 15;
        
        // Keep tooltip within canvas bounds
        if (tooltipX < 10) tooltipX = 10;
        if (tooltipX + tooltipWidth > canvas.width) tooltipX = canvas.width - tooltipWidth - 10;
        if (tooltipY < 10) tooltipY = point.y + 20;
        
        // Draw tooltip background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        
        // Draw tooltip text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
        ctx.textAlign = 'center';
        ctx.fillText(point.miles.toFixed(1) + ' mi', tooltipX + tooltipWidth / 2, tooltipY + 16);
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
        ctx.fillText('Week ' + point.weekNum, tooltipX + tooltipWidth / 2, tooltipY + 30);
        
        // Highlight the hovered point
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    function redrawChart() {
        // Redraw just the chart without tooltips
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
        
        // Redraw grid
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(scaledWidth - padding, y);
            ctx.stroke();
        }
        
        // Redraw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, scaledHeight - padding);
        ctx.lineTo(scaledWidth - padding, scaledHeight - padding);
        ctx.stroke();
        
        // Redraw Y-axis labels
        ctx.fillStyle = '#666';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            const miles = Math.round((maxMiles / 5) * (5 - i));
            ctx.fillText(miles + 'mi', padding - 10, y + 4);
        }
        
        // Redraw line
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
            const y = scaledHeight - padding - (point.miles / maxMiles) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Redraw points
        ctx.fillStyle = '#667eea';
        data.forEach((point, index) => {
            const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
            const y = scaledHeight - padding - (point.miles / maxMiles) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Ensure all modals start hidden
    document.getElementById('distanceModal').classList.add('hidden');
    document.getElementById('coachPanel').classList.add('hidden');
    
    // Set up auth handlers
    document.getElementById('authSubmitBtn').addEventListener('click', handleAuthSubmit);
    document.getElementById('toggleAuthMode').addEventListener('click', () => switchAuthMode(!isSignUpMode));
    
    // Set up coach panel handlers (both close buttons)
    const closeButtons = document.querySelectorAll('[id^="closeCoachPanelBtn"]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', toggleCoachPanel);
    });
    document.getElementById('uploadScheduleBtn').addEventListener('click', uploadSchedule);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Show JSON format example
    const formatExample = {
        2026: {
            3: {
                month: 'March',
                phase: 'Durability Phase',
                description: 'All runs at easy pace',
                hills: 'Hill strides when noted',
                weeks: [
                    {
                        weekNum: 10,
                        startDate: '3/2',
                        endDate: '3/8',
                        total: '22 miles',
                        days: [
                            { date: '3/2', day: 'Mon', workout: '4 mi', offDay: false },
                            { date: '3/3', day: 'Tue', workout: '5 mi', offDay: false },
                            { date: '3/4', day: 'Wed', workout: 'OFF', offDay: true },
                            { date: '3/5', day: 'Thu', workout: '6 mi', offDay: false },
                            { date: '3/6', day: 'Fri', workout: 'OFF', offDay: true },
                            { date: '3/7', day: 'Sat', workout: '7 mi', offDay: false },
                            { date: '3/8', day: 'Sun', workout: 'OFF', offDay: true }
                        ]
                    }
                ]
            }
        }
    };
    document.getElementById('scheduleFormatExample').textContent = JSON.stringify(formatExample, null, 2);
    
    // Initialize the app
    initializeApp();
});

// Coach Panel and Runner Selector Functions
function toggleCoachPanel() {
    const coachPanel = document.getElementById('coachPanel');
    coachPanel.classList.toggle('hidden');
}

async function populateRunnerDropdown(runners) {
    const dropdown = document.getElementById('runnerDropdown');
    
    // Clear existing options except the first one
    while (dropdown.options.length > 1) {
        dropdown.remove(1);
    }
    
    // Add runners to dropdown
    runners.forEach(runner => {
        const option = document.createElement('option');
        option.value = runner.id;
        option.textContent = runner.email;
        dropdown.appendChild(option);
    });
}

async function loadRunnerData(runnerId) {
    // Load the selected runner's data into memory for viewing
    const completedData = await loadCompletedWorkouts(runnerId);
    actualDistances = await loadActualDistances(runnerId);
    blankWeekGoals = await loadBlankWeekGoals(runnerId);
    blankWeekWorkouts = await loadBlankWeekWorkouts(runnerId);
    swappedWorkouts = await loadSwappedWorkouts(runnerId);
    
    // Filter out false values - only keep true entries
    completedWorkouts = {};
    for (const [key, value] of Object.entries(completedData)) {
        if (value === true) {
            completedWorkouts[key] = true;
        }
    }
}

async function uploadSchedule() {
    const jsonInput = document.getElementById('scheduleJsonInput').value;
    const uploadYear = parseInt(document.getElementById('uploadYear').value);
    const uploadStatus = document.getElementById('uploadStatus');
    
    if (!viewingRunnerId) {
        uploadStatus.textContent = 'Please select a runner first';
        uploadStatus.className = 'upload-status error';
        return;
    }
    
    if (!jsonInput.trim()) {
        uploadStatus.textContent = 'Please paste a JSON schedule';
        uploadStatus.className = 'upload-status error';
        return;
    }
    
    try {
        // Parse the JSON
        const scheduleJson = JSON.parse(jsonInput);
        
        // Validate the structure
        if (!scheduleJson[uploadYear]) {
            uploadStatus.textContent = 'Error: JSON must contain data for year ' + uploadYear;
            uploadStatus.className = 'upload-status error';
            return;
        }
        
        // Update the global scheduleData
        if (!scheduleData[uploadYear]) {
            scheduleData[uploadYear] = {};
        }
        Object.assign(scheduleData[uploadYear], scheduleJson[uploadYear]);
        
        // Save to Supabase with runner ID
        await saveScheduleToSupabase(viewingRunnerId, uploadYear, scheduleData[uploadYear]);

        
        // Clear input and show success
        document.getElementById('scheduleJsonInput').value = '';
        uploadStatus.textContent = 'Schedule uploaded successfully!';
        uploadStatus.className = 'upload-status success';
        
        // Re-render the calendar with new schedule
        renderCalendar();
        drawMileageChart();
        
        // Hide the panel after 2 seconds
        setTimeout(() => {
            toggleCoachPanel();
        }, 2000);
        
    } catch (error) {
        uploadStatus.textContent = 'Error: Invalid JSON - ' + error.message;
        uploadStatus.className = 'upload-status error';
    }
}

async function handleSignIn() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    
    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password';
        return;
    }
    
    const { data, error } = await signIn(email, password);
    if (error) {
        errorEl.textContent = error.message;
    } else {
        // Call initializeApp to properly load role and set up UI
        await initializeApp();
    }
}

async function handleAuthSubmit() {
    if (isSignUpMode) {
        await handleSignUp();
    } else {
        await handleSignIn();
    }
}

async function handleSignUp() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    
    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password';
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        return;
    }
    
    const { data, error } = await signUp(email, password);
    if (error) {
        errorEl.textContent = error.message;
    } else {
        // Check if this is your coach email and make them a coach
        // Replace 'coach@example.com' with your actual email
        const isCoach = email.toLowerCase() === 'aaronup87@yahoo.com'; // Change this to your email
        const role = isCoach ? 'coach' : 'runner';
        
        await saveUserRole(data.user.id, role);
        
        // Account created - try signing in immediately
        errorEl.style.color = '#27ae60';
        errorEl.textContent = 'Account created! Signing you in...';
        setTimeout(async () => {
            const { data: signInData, error: signInError } = await signIn(email, password);
            if (signInError) {
                errorEl.style.color = '#e74c3c';
                errorEl.textContent = 'Account created but sign in failed: ' + signInError.message;
            } else {
                // Call initializeApp to properly load role and set up UI
                await initializeApp();
            }
        }, 1500);
    }
}
