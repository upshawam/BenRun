# Ben's Running Schedule

A mobile-friendly running schedule calendar built for GitHub Pages. Track your running workouts week by week with the ability to swap workouts between days.

## Features

- **Mobile-First Design**: Fully responsive calendar that works great on phones, tablets, and desktop
- **Month Navigation**: Browse through different months of your training schedule
- **Workout Swapping**: Easily swap workouts between days within a week
- **Persistent Swaps**: Your workout changes are saved in browser localStorage
- **GitHub Pages Ready**: Deploy directly to GitHub Pages with no server needed

## Getting Started

1. **Deploy to GitHub Pages**:
   - Push this repo to GitHub
   - Go to Settings → Pages → Build and deployment
   - Select "Deploy from a branch" and choose `main` branch
   - Your site will be live at `https://yourusername.github.io/BenRun/`

2. **Run Locally**:
   - Open `index.html` in your web browser
   - Or use a local server: `python -m http.server 8000`

## How to Use

1. **View Schedule**: The calendar displays your monthly training plan by week
2. **Swap Workouts**: Click "Swap Workouts This Week" to swap two workouts within a week
3. **Navigate Months**: Use Previous/Next buttons to view other months

## Customization

### Adding New Months

Edit `data.js` to add more training phases and months:

```javascript
const scheduleData = {
    2026: {
        4: {  // April
            month: 'April',
            phase: 'Your Phase Name',
            description: 'Description of training phase',
            hills: 'Notes about hill workouts',
            weeks: [
                // Add your weeks here
            ]
        }
    }
};
```

### Updating Styling

Modify `style.css` to change colors, fonts, or layout. Key CSS variables:

```css
:root {
    --primary-color: #2ecc71;    /* Green */
    --secondary-color: #3498db;  /* Blue */
    --danger-color: #e74c3c;     /* Red */
}
```

## Browser Compatibility

- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Uses localStorage for saving workout swaps

## Notes

- All runs are at easy conversational pace (~9:00/mi)
- Hill strides = 20 sec uphill @ fast-but-relaxed, walk back
- Swapped workouts are saved locally and persist across page reloads

## Future Enhancements

- Add April and beyond schedules
- Export/import workout data
- Advanced statistics and analytics
- Integration with running apps
