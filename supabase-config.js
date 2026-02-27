// Supabase Configuration
// 
// Required Tables:
// - completed_workouts: (id, user_id, date_key, completed, created_at, updated_at)
// - actual_distances: (id, user_id, date_key, distance, created_at, updated_at)
// - blank_week_goals: (id, user_id, week_key, goal_miles, created_at, updated_at)
// - blank_week_workouts: (id, user_id, week_key, workout_description, created_at, updated_at)
// - swapped_workouts: (id, user_id, swap_key, new_workout, created_at, updated_at)
// - training_schedules: (id, coach_id, year, schedule_json, created_at, updated_at)
//
// All tables should have RLS enabled with policies limiting access to the user's own data
// training_schedules is writable by coach_id owner only
//
const SUPABASE_URL = 'https://ugvuuksgrebekoergymq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndnV1a3NncmViZWtvZXJneW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTEwMDUsImV4cCI6MjA4NzcyNzAwNX0.jRAR9Tv21ibdcShJkQV5_NjipT0W6l9_uweuQrpQ3Nw';

// Initialize Supabase client after library loads
let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// Check if user is logged in
async function checkAuth() {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    return session;
}

// Sign up
async function signUp(email, password) {
    const client = getSupabaseClient();
    if (!client) return { data: null, error: 'Supabase not initialized' };
    const { data, error } = await client.auth.signUp({
        email,
        password
    });
    return { data, error };
}

// Sign in
async function signIn(email, password) {
    const client = getSupabaseClient();
    if (!client) return { data: null, error: 'Supabase not initialized' };
    const { data, error } = await client.auth.signInWithPassword({
        email,
        password
    });
    return { data, error };
}

// Sign out
async function signOut() {
    const client = getSupabaseClient();
    if (!client) return 'Supabase not initialized';
    const { error } = await client.auth.signOut();
    return error;
}

// Get current user
async function getCurrentUser() {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data: { user } } = await client.auth.getUser();
    return user;
}

// DATABASE OPERATIONS

// Load completed workouts for current user
async function loadCompletedWorkouts(userId) {
    const client = getSupabaseClient();
    if (!client) return {};
    
    const { data, error } = await client
        .from('completed_workouts')
        .select('*')
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error loading completed workouts:', error);
        return {};
    }
    
    const result = {};
    (data || []).forEach(row => {
        result[row.date_key] = row.completed;
    });
    return result;
}

// Load actual distances for current user
async function loadActualDistances(userId) {
    const client = getSupabaseClient();
    if (!client) return {};
    
    const { data, error } = await client
        .from('actual_distances')
        .select('*')
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error loading actual distances:', error);
        return {};
    }
    
    const result = {};
    (data || []).forEach(row => {
        result[row.date_key] = row.distance;
    });
    return result;
}

// Load blank week goals for current user
async function loadBlankWeekGoals(userId) {
    const client = getSupabaseClient();
    if (!client) return {};
    
    const { data, error } = await client
        .from('blank_week_goals')
        .select('*')
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error loading blank week goals:', error);
        return {};
    }
    
    const result = {};
    (data || []).forEach(row => {
        result[row.week_key] = row.goal_miles;
    });
    return result;
}

// Load blank week workouts for current user
async function loadBlankWeekWorkouts(userId) {
    const client = getSupabaseClient();
    if (!client) return {};
    
    const { data, error } = await client
        .from('blank_week_workouts')
        .select('*')
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error loading blank week workouts:', error);
        return {};
    }
    
    const result = {};
    (data || []).forEach(row => {
        result[row.week_key] = row.workout_description;
    });
    return result;
}

// Load swapped workouts for current user
async function loadSwappedWorkouts(userId) {
    const client = getSupabaseClient();
    if (!client) return {};
    
    const { data, error } = await client
        .from('swapped_workouts')
        .select('*')
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error loading swapped workouts:', error);
        return {};
    }
    
    const result = {};
    (data || []).forEach(row => {
        result[row.swap_key] = row.new_workout;
    });
    return result;
}

// Save completed workout
async function saveCompletedWorkout(userId, dateKey, completed) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not initialized' };
    
    // Always try update first
    await client
        .from('completed_workouts')
        .update({ completed })
        .eq('user_id', userId)
        .eq('date_key', dateKey);
    
    // Then check if record exists (suppress 406 error if no rows)
    const { data: existingRow, error: checkError } = await client
        .from('completed_workouts')
        .select('id')
        .eq('user_id', userId)
        .eq('date_key', dateKey)
        .maybeSingle();
    
    // If it still doesn't exist, insert it
    if (!existingRow && !checkError) {
        const { error } = await client
            .from('completed_workouts')
            .insert({ user_id: userId, date_key: dateKey, completed });
        return { error };
    }
    
    return { error: null };
}

// Save actual distance
async function saveActualDistance(userId, dateKey, distance) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not initialized' };
    
    // Always try update first
    await client
        .from('actual_distances')
        .update({ distance })
        .eq('user_id', userId)
        .eq('date_key', dateKey);
    
    // Then check if record exists (suppress 406 error if no rows)
    const { data: existingRow, error: checkError } = await client
        .from('actual_distances')
        .select('id')
        .eq('user_id', userId)
        .eq('date_key', dateKey)
        .maybeSingle();
    
    // If it still doesn't exist, insert it
    if (!existingRow && !checkError) {
        const { error } = await client
            .from('actual_distances')
            .insert({ user_id: userId, date_key: dateKey, distance });
        return { error };
    }
    
    return { error: null };
}

// Save blank week goal
async function saveBlankWeekGoal(userId, weekKey, goalMiles) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not initialized' };
    
    // Always try update first
    await client
        .from('blank_week_goals')
        .update({ goal_miles: goalMiles })
        .eq('user_id', userId)
        .eq('week_key', weekKey);
    
    // Then check if record exists (suppress 406 error if no rows)
    const { data: existingRow, error: checkError } = await client
        .from('blank_week_goals')
        .select('id')
        .eq('user_id', userId)
        .eq('week_key', weekKey)
        .maybeSingle();
    
    // If it still doesn't exist, insert it
    if (!existingRow && !checkError) {
        const { error } = await client
            .from('blank_week_goals')
            .insert({ user_id: userId, week_key: weekKey, goal_miles: goalMiles });
        return { error };
    }
    
    return { error: null };
}

// Save blank week workout
async function saveBlankWeekWorkout(userId, weekKey, workoutDescription) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not initialized' };
    
    // Always try update first
    await client
        .from('blank_week_workouts')
        .update({ workout_description: workoutDescription })
        .eq('user_id', userId)
        .eq('week_key', weekKey);
    
    // Then check if record exists (suppress 406 error if no rows)
    const { data: existingRow, error: checkError } = await client
        .from('blank_week_workouts')
        .select('id')
        .eq('user_id', userId)
        .eq('week_key', weekKey)
        .maybeSingle();
    
    // If it still doesn't exist, insert it
    if (!existingRow && !checkError) {
        const { error } = await client
            .from('blank_week_workouts')
            .insert({ user_id: userId, week_key: weekKey, workout_description: workoutDescription });
        return { error };
    }
    
    return { error: null };
}

// Save swapped workout
async function saveSwappedWorkout(userId, swapKey, newWorkout) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not initialized' };
    
    // Always try update first
    await client
        .from('swapped_workouts')
        .update({ new_workout: newWorkout })
        .eq('user_id', userId)
        .eq('swap_key', swapKey);
    
    // Then check if record exists (suppress 406 error if no rows)
    const { data: existingRow, error: checkError } = await client
        .from('swapped_workouts')
        .select('id')
        .eq('user_id', userId)
        .eq('swap_key', swapKey)
        .maybeSingle();
    
    // If it still doesn't exist, insert it
    if (!existingRow && !checkError) {
        const { error } = await client
            .from('swapped_workouts')
            .insert({ user_id: userId, swap_key: swapKey, new_workout: newWorkout });
        return { error };
    }
    
    return { error: null };
}

// Migrate localStorage data to Supabase (one-time on first login)
async function migrateLocalStorageToSupabase(userId) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not initialized' };
    
    try {
        // Load localStorage data
        const swaps = localStorage.getItem('benrunSwaps');
        const completed = localStorage.getItem('benrunCompleted');
        const distances = localStorage.getItem('benrunDistances');
        const goals = localStorage.getItem('benrunBlankWeekGoals');
        const workouts = localStorage.getItem('benrunBlankWeekWorkouts');
        
        let hasData = false;
        
        // Migrate swapped workouts
        if (swaps) {
            const swapData = JSON.parse(swaps);
            for (const [weekKey, swapInfo] of Object.entries(swapData)) {
                await saveSwappedWorkout(userId, weekKey, swapInfo);
                hasData = true;
            }
        }
        
        // Migrate completed workouts
        if (completed) {
            const completedData = JSON.parse(completed);
            for (const [dateKey, workout] of Object.entries(completedData)) {
                await saveCompletedWorkout(userId, dateKey, workout);
                hasData = true;
            }
        }
        
        // Migrate actual distances
        if (distances) {
            const distanceData = JSON.parse(distances);
            for (const [dateKey, distance] of Object.entries(distanceData)) {
                // Only migrate valid date keys (skip old format)
                if (!dateKey.includes('/')) continue;
                await saveActualDistance(userId, dateKey, distance);
                hasData = true;
            }
        }
        
        // Migrate blank week goals
        if (goals) {
            const goalData = JSON.parse(goals);
            for (const [weekKey, goal] of Object.entries(goalData)) {
                await saveBlankWeekGoal(userId, weekKey, goal);
                hasData = true;
            }
        }
        
        // Migrate blank week workouts
        if (workouts) {
            const workoutData = JSON.parse(workouts);
            for (const [weekKey, workout] of Object.entries(workoutData)) {
                await saveBlankWeekWorkout(userId, weekKey, workout);
                hasData = true;
            }
        }
        
        // If we migrated data, clear localStorage
        if (hasData) {
            localStorage.removeItem('benrunSwaps');
            localStorage.removeItem('benrunCompleted');
            localStorage.removeItem('benrunDistances');
            localStorage.removeItem('benrunBlankWeekGoals');
            localStorage.removeItem('benrunBlankWeekWorkouts');
            console.log('Successfully migrated data to Supabase');
        }
        
        return { error: null };
    } catch (err) {
        console.error('Migration error:', err);
        return { error: err };
    }
}

// Save schedule to Supabase (coaches only)
async function saveScheduleToSupabase(userId, year, scheduleData) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not initialized' };
    
    try {
        const scheduleJson = JSON.stringify(scheduleData);
        
        // Try to update first
        const { data: updateData, error: updateError } = await client
            .from('training_schedules')
            .update({ schedule_json: scheduleJson, updated_at: new Date() })
            .eq('coach_id', userId)
            .eq('year', year)
            .maybeSingle();
        
        // If no rows were updated, insert
        if (!updateError && !updateData) {
            const { error: insertError } = await client
                .from('training_schedules')
                .insert({
                    coach_id: userId,
                    year: year,
                    schedule_json: scheduleJson
                });
            
            if (insertError) {
                console.error('Schedule insert error:', insertError);
                return { error: insertError };
            }
        } else if (updateError) {
            console.error('Schedule update error:', updateError);
            return { error: updateError };
        }
        
        return { error: null };
    } catch (err) {
        console.error('Error saving schedule:', err);
        return { error: err };
    }
}

// Load schedule from Supabase (for coaches to view uploaded schedules)
async function loadScheduleFromSupabase(userId, year) {
    const client = getSupabaseClient();
    if (!client) return null;
    
    try {
        const { data, error } = await client
            .from('training_schedules')
            .select('schedule_json')
            .eq('coach_id', userId)
            .eq('year', year)
            .maybeSingle();
        
        if (error) {
            console.error('Error loading schedule:', error);
            return null;
        }
        
        if (data && data.schedule_json) {
            return JSON.parse(data.schedule_json);
        }
        
        return null;
    } catch (err) {
        console.error('Error loading schedule:', err);
        return null;
    }
}

// Save user role to Supabase
async function saveUserRole(userId, role) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not initialized' };
    
    try {
        // Try to update first
        const { data: updateData, error: updateError } = await client
            .from('user_profiles')
            .update({ role: role, updated_at: new Date() })
            .eq('id', userId)
            .maybeSingle();
        
        // If no rows were updated, insert
        if (!updateError && !updateData) {
            const { error: insertError } = await client
                .from('user_profiles')
                .insert({
                    id: userId,
                    role: role
                });
            
            if (insertError) {
                console.error('User role insert error:', insertError);
                return { error: insertError };
            }
        } else if (updateError) {
            console.error('User role update error:', updateError);
            return { error: updateError };
        }
        
        return { error: null };
    } catch (err) {
        console.error('Error saving user role:', err);
        return { error: err };
    }
}

// Load user role from Supabase
async function loadUserRole(userId) {
    const client = getSupabaseClient();
    if (!client) {
        return 'runner';
    }
    
    try {
        const { data, error } = await client
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();
        
        if (error) {
            console.error('Error loading user role:', error.message);
            return 'runner';
        }
        
        if (data && data.role) {
            return data.role;
        }
        
        return 'runner';
    } catch (err) {
        console.error('Error loading user role:', err);
        return 'runner';
    }
}

// Get all runners (for coach view)
async function getAllRunners() {
    const client = getSupabaseClient();
    if (!client) return [];
    
    try {
        const { data, error } = await client
            .from('user_profiles')
            .select('id, email')
            .eq('role', 'runner');
        
        if (error) {
            console.error('Error loading runners:', error);
            return [];
        }
        
        return data || [];
    } catch (err) {
        console.error('Error loading runners:', err);
        return [];
    }
}

// Ensure user profile exists (create if missing on first login)
async function ensureUserProfileExists(userId, userEmail) {
    const client = getSupabaseClient();
    if (!client) return;
    
    try {
        // Check if profile exists
        const { data: existingProfile, error: checkError } = await client
            .from('user_profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
        
        if (checkError) {
            console.error('Error checking profile:', checkError);
            return;
        }
        
        // If profile doesn't exist, try to create it with 'runner' role by default
        if (!existingProfile) {
            const { error: insertError } = await client
                .from('user_profiles')
                .insert({
                    id: userId,
                    email: userEmail,
                    role: 'runner'
                });
            
            if (insertError) {
                // If it's an RLS error, just log it - user might not have permission to create their own profile
                if (insertError.code === '42501') {
                    console.log('User profile creation blocked by RLS (expected for some users)');
                } else {
                    console.error('Error creating profile:', insertError);
                }
            } else {
                console.log('Profile created for user:', userId);
            }
        }
    } catch (err) {
        console.error('Error ensuring profile exists:', err);
    }
}
