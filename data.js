// Running Schedule Data Structure
const scheduleData = {
    2026: {
        2: {
            month: 'February',
            phase: 'Base Building Phase',
            description: 'All runs at easy conversational pace (~9:00/mi). No strides until Week 3.',
            hills: 'Hill strides = 20 sec uphill @ fast-but-relaxed, walk back',
            weeks: [
                {
                    weekNum: 6,
                    startDate: '2/2',
                    endDate: '2/8',
                    total: '13 miles',
                    days: [
                        { date: '2/2', day: 'Mon', workout: '4 mi', offDay: false },
                        { date: '2/3', day: 'Tue', workout: 'OFF', offDay: true },
                        { date: '2/4', day: 'Wed', workout: '4 mi', offDay: false },
                        { date: '2/5', day: 'Thu', workout: 'OFF', offDay: true },
                        { date: '2/6', day: 'Fri', workout: '5 mi', offDay: false },
                        { date: '2/7', day: 'Sat', workout: 'OFF', offDay: true },
                        { date: '2/8', day: 'Sun', workout: 'OFF', offDay: true }
                    ]
                },
                {
                    weekNum: 7,
                    startDate: '2/9',
                    endDate: '2/15',
                    total: '18 miles',
                    days: [
                        { date: '2/9', day: 'Mon', workout: '4 mi', offDay: false },
                        { date: '2/10', day: 'Tue', workout: '4 mi', offDay: false },
                        { date: '2/11', day: 'Wed', workout: 'OFF', offDay: true },
                        { date: '2/12', day: 'Thu', workout: '5 mi', offDay: false },
                        { date: '2/13', day: 'Fri', workout: 'OFF', offDay: true },
                        { date: '2/14', day: 'Sat', workout: '5 mi', offDay: false },
                        { date: '2/15', day: 'Sun', workout: 'OFF', offDay: true }
                    ]
                },
                {
                    weekNum: 8,
                    startDate: '2/16',
                    endDate: '2/22',
                    total: '20 miles',
                    days: [
                        { date: '2/16', day: 'Mon', workout: '4 mi', offDay: false },
                        { date: '2/17', day: 'Tue', workout: '5 mi', offDay: false },
                        { date: '2/18', day: 'Wed', workout: 'OFF', offDay: true },
                        { date: '2/19', day: 'Thu', workout: '5 mi + 4×20s hill strides', offDay: false },
                        { date: '2/20', day: 'Fri', workout: 'OFF', offDay: true },
                        { date: '2/21', day: 'Sat', workout: '6 mi', offDay: false },
                        { date: '2/22', day: 'Sun', workout: 'OFF', offDay: true }
                    ]
                },
                {
                    weekNum: 9,
                    startDate: '2/23',
                    endDate: '3/1',
                    total: '21 miles',
                    days: [
                        { date: '2/23', day: 'Mon', workout: '4 mi', offDay: false },
                        { date: '2/24', day: 'Tue', workout: '5 mi', offDay: false },
                        { date: '2/25', day: 'Wed', workout: 'OFF', offDay: true },
                        { date: '2/26', day: 'Thu', workout: '6 mi + 6×20s hill strides', offDay: false },
                        { date: '2/27', day: 'Fri', workout: 'OFF', offDay: true },
                        { date: '2/28', day: 'Sat', workout: '6 mi', offDay: false },
                        { date: '3/1', day: 'Sun', workout: 'OFF', offDay: true }
                    ]
                }
            ]
        },
        3: {
            month: 'March',
            phase: 'Durability + Consistency Phase',
            description: 'All runs at easy conversational pace (~9:00/mi)',
            hills: 'Hill strides = 20 sec uphill @ fast-but-relaxed, walk back',
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
                        { date: '3/5', day: 'Thu', workout: '6 mi + 6×20s hill strides', offDay: false },
                        { date: '3/6', day: 'Fri', workout: 'OFF', offDay: true },
                        { date: '3/7', day: 'Sat', workout: '7 mi', offDay: false },
                        { date: '3/8', day: 'Sun', workout: 'OFF', offDay: true }
                    ]
                },
                {
                    weekNum: 11,
                    startDate: '3/9',
                    endDate: '3/15',
                    total: '22 miles',
                    days: [
                        { date: '3/9', day: 'Mon', workout: '4 mi', offDay: false },
                        { date: '3/10', day: 'Tue', workout: '5 mi', offDay: false },
                        { date: '3/11', day: 'Wed', workout: 'OFF', offDay: true },
                        { date: '3/12', day: 'Thu', workout: '6 mi + 6×20s hill strides', offDay: false },
                        { date: '3/13', day: 'Fri', workout: 'OFF', offDay: true },
                        { date: '3/14', day: 'Sat', workout: '7 mi', offDay: false },
                        { date: '3/15', day: 'Sun', workout: 'OFF', offDay: true }
                    ]
                },
                {
                    weekNum: 12,
                    startDate: '3/16',
                    endDate: '3/22',
                    total: '23 miles',
                    days: [
                        { date: '3/16', day: 'Mon', workout: '4 mi', offDay: false },
                        { date: '3/17', day: 'Tue', workout: '5 mi', offDay: false },
                        { date: '3/18', day: 'Wed', workout: 'OFF', offDay: true },
                        { date: '3/19', day: 'Thu', workout: '6 mi + 8×20s hill strides', offDay: false },
                        { date: '3/20', day: 'Fri', workout: 'OFF', offDay: true },
                        { date: '3/21', day: 'Sat', workout: '8 mi', offDay: false },
                        { date: '3/22', day: 'Sun', workout: 'OFF', offDay: true }
                    ]
                },
                {
                    weekNum: 13,
                    startDate: '3/23',
                    endDate: '3/29',
                    total: '23 miles',
                    days: [
                        { date: '3/23', day: 'Mon', workout: '4 mi', offDay: false },
                        { date: '3/24', day: 'Tue', workout: '5 mi', offDay: false },
                        { date: '3/25', day: 'Wed', workout: 'OFF', offDay: true },
                        { date: '3/26', day: 'Thu', workout: '6 mi + 8×20s hill strides', offDay: false },
                        { date: '3/27', day: 'Fri', workout: 'OFF', offDay: true },
                        { date: '3/28', day: 'Sat', workout: '8 mi', offDay: false },
                        { date: '3/29', day: 'Sun', workout: 'OFF', offDay: true }
                    ]
                },
                {
                    weekNum: 14,
                    startDate: '3/30',
                    endDate: '4/5',
                    total: '22 miles',
                    days: [
                        { date: '3/30', day: 'Mon', workout: '4 mi', offDay: false },
                        { date: '3/31', day: 'Tue', workout: '5 mi', offDay: false },
                        { date: '4/1', day: 'Wed', workout: 'OFF', offDay: true },
                        { date: '4/2', day: 'Thu', workout: '6 mi + 8×20s hill strides', offDay: false },
                        { date: '4/3', day: 'Fri', workout: 'OFF', offDay: true },
                        { date: '4/4', day: 'Sat', workout: '8 mi', offDay: false },
                        { date: '4/5', day: 'Sun', workout: 'OFF', offDay: true }
                    ]
                }
            ]
        }
    }
};
