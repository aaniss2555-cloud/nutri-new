function ProgressStrip({ days = [], title = "Progress", subtitle = "Hover a day to see calories.", actions = null }) {
  const formatDate = (value) => {
    if (!value) {
      return "Unknown date";
    }

    return new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  };

  const totalCalories = days.reduce((sum, day) => sum + (day.calories || 0), 0);
  const averageCalories = days.length ? Math.round(totalCalories / days.length) : 0;
  const goal = days.find((day) => day.goal)?.goal || null;

  return (
    <div className="progress-strip-card">
      <div className="progress-strip-header">
        <div>
          <h5>{title}</h5>
          <p>{subtitle}</p>
        </div>
        <div className="progress-strip-stats">
          <span>Avg</span>
          <strong>{averageCalories} kcal</strong>
        </div>
      </div>

      <div className="progress-strip" role="list" aria-label="Daily calorie progress">
        {days.map((day) => {
          const tooltip = `${formatDate(day.date)} - ${day.calories || 0} kcal${day.goal ? ` / ${day.goal} kcal goal` : ""}`;
          return (
            <div
              key={day.date}
              className={`progress-segment ${day.status || "neutral"}`}
              role="listitem"
              title={tooltip}
            >
              <span>{day.label}</span>
              <strong>{day.calories ? day.calories : "No log"}</strong>
              <em>{tooltip}</em>
            </div>
          );
        })}
      </div>

      <div className="progress-legend">
        <span><i className="legend-dot under"></i> Far under goal</span>
        <span><i className="legend-dot on-track"></i> Near goal</span>
        <span><i className="legend-dot over"></i> Far over goal</span>
        {!goal && <span><i className="legend-dot neutral"></i> No target yet</span>}
      </div>
    </div>
  );
}

export default ProgressStrip;


